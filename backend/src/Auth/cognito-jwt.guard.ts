// import * as jwt from 'jsonwebtoken';
// import jwksClient from 'jwks-rsa';
// import {
//     Injectable,
//     CanActivate,
//     ExecutionContext,
//     UnauthorizedException,
// } from '@nestjs/common';
//
// @Injectable()
// export class CognitoJwtGuard implements CanActivate {
//     private jwks: jwksClient.JwksClient;
//
//     constructor() {
//         this.jwks = jwksClient({
//             jwksUri: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
//             cache: true,
//             rateLimit: true,
//         });
//     }
//
//     async canActivate(context: ExecutionContext): Promise<boolean> {
//         const request = context.switchToHttp().getRequest();
//         const authHeader = request.headers.authorization;
//
//         if (!authHeader || !authHeader.startsWith('Bearer ')) {
//             throw new UnauthorizedException('Missing token');
//         }
//
//         const token = authHeader.split(' ')[1];
//
//         try {
//             const decoded = jwt.decode(token, { complete: true });
//             console.log('Decoded token header:', decoded?.header); // DEBUG
//             if (!decoded || !decoded.header.kid) {
//                 throw new UnauthorizedException('Invalid token header');
//             }
//
//             const key = await this.jwks.getSigningKey(decoded.header.kid);
//             const publicKey = key.getPublicKey();
//             console.log('Fetched public key (first 50 chars):', publicKey.substring(0, 50)); // DEBUG
//
//             const payload = jwt.verify(token, publicKey, {
//                 algorithms: ['RS256'],
//                 issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
//             }) as any;
//
//             console.log('JWT verified successfully. Payload:', payload); // DEBUG
//
//             request.user = {
//                 userId: payload.sub,
//                 email: payload.email,
//                 role: payload['custom:role'] || 'Employee',
//                 teamId: payload['custom:team_id'] || null,
//             };
//             return true;
//         } catch (err) {
//             console.error('JWT verification error:', err.message);
//             throw new UnauthorizedException('Invalid token');
//         }
//     }
// }

import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class CognitoJwtGuard implements CanActivate {
    private jwks: jwksClient.JwksClient;

    constructor() {
        this.jwks = jwksClient({
            jwksUri: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
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
            console.log('Decoded token header:', decoded?.header);
            if (!decoded || !decoded.header.kid) {
                throw new UnauthorizedException('Invalid token header');
            }

            const key = await this.jwks.getSigningKey(decoded.header.kid);
            const publicKey = key.getPublicKey();
            console.log('Fetched public key (first 50 chars):', publicKey.substring(0, 50));

            // Temporarily removed issuer check for debugging
            const payload = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
            }) as any;

            console.log('Expected issuer:', `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`);
            console.log('Token issuer from payload:', (jwt.decode(token) as any)?.iss);

            console.log('JWT verified successfully. Payload:', payload);

            request.user = {
                userId: payload.sub,
                email: payload.email,
                role: payload['custom:role'] || 'Employee',
                teamId: payload['custom:team_id'] || null,
            };
            return true;
        } catch (err) {
            console.error('JWT verification error:', err.message);
            throw new UnauthorizedException('Invalid token');
        }
    }
}