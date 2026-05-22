import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AwsService } from './AWS/AWSService';
import passport from 'passport';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('Bootstrap');

    // Enable CORS for frontend requests
    app.enableCors();

    // Serve static frontend files from the 'public' directory
    app.use(express.static(join(__dirname, '..', 'public')));

    // Enable global validation using class-validator
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Configure Swagger API Documentation
    const config = new DocumentBuilder()
        .setTitle('Mini-Jira API')
        .setDescription('The API for the Mini-Jira AWS application')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    app.use(passport.initialize());

    // ---- React fallback (must be AFTER static middleware) ----
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req, res, next) => {
        // If the response has already been sent (by a controller or static file), skip
        if (res.headersSent) return next();

        // Let API routes pass through (do NOT serve index.html)
        if (
            req.path.startsWith('/users') ||
            req.path.startsWith('/tasks') ||
            req.path.startsWith('/projects') ||
            req.path.startsWith('/comments') ||
            req.path.startsWith('/teams') ||
            req.path.startsWith('/health') ||
            req.path.startsWith('/aws-test') ||
            req.path.startsWith('/protected') ||
            req.path.startsWith('/api')
        ) {
            return next();
        }

        // Otherwise, serve the React app (index.html) for client‑side routing
        res.sendFile(join(__dirname, '..', 'public', 'index.html'));
    });
    // ----------------------------------------------------------

    // Start the server
    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);

    // Check AWS Connection on startup
    try {
        const awsService = app.get(AwsService);
        const connectionStatus = await awsService.testConnection();
        if (connectionStatus.tablesFound) {
            logger.log(`Successfully connected to AWS! Found ${connectionStatus.tablesFound.length} DynamoDB tables.`);
        } else {
            logger.warn(`Connected to AWS, but no DynamoDB tables were found or an error occurred: ${connectionStatus.error}`);
        }
    } catch (error) {
        logger.error(`Failed to verify AWS connection on startup: ${error.message}`);
    }
}
bootstrap();