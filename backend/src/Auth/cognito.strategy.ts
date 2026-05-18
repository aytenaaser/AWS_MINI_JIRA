import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class CognitoJwtStrategy extends PassportStrategy(Strategy, 'cognito') {
    constructor() {
        const jwksUri = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
        console.log('JWKS URI:', jwksUri); // DEBUG

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            algorithms: ['RS256'],
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksUri,
            }),
        });
    }

    async validate(payload: any) {
        console.log('Validating JWT payload:', payload); // DEBUG
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload['custom:role'] || 'Employee',
            teamId: payload['custom:team_id'] || null,
        };
    }
}