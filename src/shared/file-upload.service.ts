import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface UploadResult {
    url: string;
    key: string;
    size: number;
}

@Injectable()
export class FileUploadService {
    private readonly logger = new Logger(FileUploadService.name);
    private readonly useLocal: boolean;
    private readonly localUploadDir: string;

    constructor(private readonly configService: ConfigService) {
        // Use local storage if AWS env vars are not configured
        this.useLocal = !this.configService.get<string>('AWS_S3_BUCKET');
        this.localUploadDir = path.join(process.cwd(), 'uploads');

        if (this.useLocal) {
            // Ensure uploads directory exists
            if (!fs.existsSync(this.localUploadDir)) {
                fs.mkdirSync(this.localUploadDir, { recursive: true });
            }
            this.logger.warn('Using LOCAL file storage (configure AWS_S3_BUCKET for S3)');
        }
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string,
    ): Promise<UploadResult> {
        const ext = path.extname(file.originalname);
        const uniqueName = `${crypto.randomUUID()}${ext}`;
        const key = `${folder}/${uniqueName}`;

        if (this.useLocal) {
            return this.uploadLocal(file, key);
        }

        return this.uploadToS3(file, key);
    }

    async deleteFile(key: string): Promise<void> {
        if (this.useLocal) {
            const filePath = path.join(this.localUploadDir, key);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return;
        }

        // TODO: Implement S3 delete in Phase 10
        this.logger.log(`[S3 DELETE STUB] Would delete: ${key}`);
    }

    async generateSignedUrl(key: string, _expiresIn = 3600): Promise<string> {
        if (this.useLocal) {
            return `/uploads/${key}`;
        }

        // TODO: Implement S3 presigned URL in Phase 10
        const bucket = this.configService.get<string>('AWS_S3_BUCKET');
        const region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    validateFileType(mimeType: string, allowedTypes: string[]): boolean {
        return allowedTypes.includes(mimeType);
    }

    validateFileSize(sizeBytes: number, maxMB: number): boolean {
        return sizeBytes <= maxMB * 1024 * 1024;
    }

    validateUpload(
        file: Express.Multer.File,
        opts: { allowedTypes: string[]; maxMB: number },
    ): void {
        if (!this.validateFileType(file.mimetype, opts.allowedTypes)) {
            throw new BadRequestException(
                `Invalid file type: ${file.mimetype}. Allowed: ${opts.allowedTypes.join(', ')}`,
            );
        }
        if (!this.validateFileSize(file.size, opts.maxMB)) {
            throw new BadRequestException(`File too large. Maximum: ${opts.maxMB}MB`);
        }
    }

    // ─── PRIVATE ──────────────────────────────

    private async uploadLocal(
        file: Express.Multer.File,
        key: string,
    ): Promise<UploadResult> {
        const filePath = path.join(this.localUploadDir, key);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, file.buffer);

        return {
            url: `/uploads/${key}`,
            key,
            size: file.size,
        };
    }

    private async uploadToS3(
        file: Express.Multer.File,
        key: string,
    ): Promise<UploadResult> {
        // TODO: Phase 10 — actual S3 upload with AWS SDK
        // For now, fall back to local and log
        this.logger.warn(`[S3 STUB] Would upload to S3: ${key}, falling back to local`);
        return this.uploadLocal(file, key);
    }
}
