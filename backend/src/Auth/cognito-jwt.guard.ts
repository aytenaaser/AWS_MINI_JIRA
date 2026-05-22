import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class CognitoJwtGuard implements CanActivate {
    private jwks: jwksClient.JwksClient;
    private cognito: AWS.CognitoIdentityServiceProvider;
    private dynamo: AWS.DynamoDB.DocumentClient;
    private userPoolId: string;

    constructor() {
        this.userPoolId = process.env.COGNITO_USER_POOL_ID as string;
        this.jwks = jwksClient({
            jwksUri: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
        });
        this.cognito = new AWS.CognitoIdentityServiceProvider({
            region: process.env.COGNITO_REGION || 'us-east-1',
        });
        this.dynamo = new AWS.DynamoDB.DocumentClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing token');
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.header.kid) {
                throw new UnauthorizedException('Invalid token header');
            }

            const key = await this.jwks.getSigningKey(decoded.header.kid);
            const publicKey = key.getPublicKey();

            const payload = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
            }) as any;

            const sub = payload.sub;

            // Fetch custom attributes from Cognito
            let role = 'Employee';
            let teamId: string | null = null;
            let cognitoFetchSucceeded = false;
            try {
                const userData = await this.cognito.adminGetUser({
                    UserPoolId: this.userPoolId,
                    Username: sub,
                }).promise();

                const attrs = userData.UserAttributes || [];
                const roleAttr = attrs.find(a => a.Name === 'custom:role');
                const teamAttr = attrs.find(a => a.Name === 'custom:team_id');

                role = roleAttr?.Value || 'Employee';
                teamId = teamAttr?.Value || null;
                cognitoFetchSucceeded = true;
            } catch (err) {
                console.warn('Could not fetch Cognito attributes, using defaults');
            }

            // Sync user to DynamoDB Users table – only pass Cognito attributes if fetch succeeded
            const user = {
                userId: sub,
                email: payload.email,
                role,
                teamId: teamId || null,
            };
            await this.syncUser(user, cognitoFetchSucceeded ? { role, teamId } : undefined);
            request.user = user;
            return true;
        } catch (err) {
            console.error('JWT verification error:', err.message);
            throw new UnauthorizedException('Invalid token');
        }
    }

    private async syncUser(user: any, cognitoAttributes?: { role: string; teamId: string | null }) {
        const tableName = process.env.TABLE_USERS || 'Users';
        try {
            const existing = await this.dynamo.get({ TableName: tableName, Key: { user_id: user.userId } }).promise();
            if (!existing.Item) {
                // New user – insert with whatever we have
                await this.dynamo.put({
                    TableName: tableName,
                    Item: {
                        user_id: user.userId,
                        email: user.email,
                        role: cognitoAttributes?.role || 'Employee',
                        team_id: cognitoAttributes?.teamId || '',
                        name: user.email.split('@')[0],
                    },
                }).promise();
            } else if (cognitoAttributes) {
                // Only update if we successfully fetched Cognito attributes
                await this.dynamo.update({
                    TableName: tableName,
                    Key: { user_id: user.userId },
                    UpdateExpression: 'SET email = :email, #rl = :role, team_id = :team_id',
                    ExpressionAttributeValues: {
                        ':email': user.email,
                        ':role': cognitoAttributes.role,
                        ':team_id': cognitoAttributes.teamId || '',
                    },
                    ExpressionAttributeNames: { '#rl': 'role' },
                }).promise();
            }
            // If cognitoAttributes is undefined (fetch failed), we leave the existing DynamoDB record untouched
        } catch (err) {
            console.error('Failed to sync user to DynamoDB:', err);
        }
    }
}