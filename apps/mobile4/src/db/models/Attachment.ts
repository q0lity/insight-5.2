/**
 * Attachment Model
 */

import { field, text, json, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';

import { SyncableModel } from './BaseModel';
import { TableNames } from '../schema';
import type { Entry } from './Entry';

type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

const sanitizeMetadata = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

export class Attachment extends SyncableModel {
  static table = TableNames.ATTACHMENTS;

  static associations = {
    [TableNames.ENTRIES]: { type: 'belongs_to' as const, key: 'entry_id' },
  };

  @field('entry_id') entryId!: string;
  @text('bucket') bucket!: string;
  @text('path') path!: string;
  @field('mime_type') mimeType!: string | null;
  @field('byte_size') byteSize!: number | null;
  @text('local_uri') localUri!: string | null;
  @field('upload_status') uploadStatus!: UploadStatus;
  @json('metadata', sanitizeMetadata) metadata!: Record<string, unknown>;

  @relation(TableNames.ENTRIES, 'entry_id') entry!: Relation<Entry>;

  get isPending(): boolean {
    return this.uploadStatus === 'pending';
  }

  get isUploading(): boolean {
    return this.uploadStatus === 'uploading';
  }

  get isUploaded(): boolean {
    return this.uploadStatus === 'uploaded';
  }

  get hasFailed(): boolean {
    return this.uploadStatus === 'failed';
  }

  get needsUpload(): boolean {
    return this.uploadStatus === 'pending' || this.uploadStatus === 'failed';
  }

  get isAudio(): boolean {
    return this.mimeType?.startsWith('audio/') ?? false;
  }

  get isImage(): boolean {
    return this.mimeType?.startsWith('image/') ?? false;
  }

  get isVideo(): boolean {
    return this.mimeType?.startsWith('video/') ?? false;
  }

  get storageUrl(): string | null {
    if (!this.bucket || !this.path) return null;
    return `${this.bucket}/${this.path}`;
  }

  toSupabasePayload(): Record<string, unknown> {
    return {
      entry_id: this.entryId,
      bucket: this.bucket,
      path: this.path,
      mime_type: this.mimeType,
      byte_size: this.byteSize,
      metadata: this.metadata,
    };
  }

  static fromSupabaseRow(row: Record<string, unknown>): Partial<Attachment> {
    return {
      remoteId: row.id as string,
      userId: row.user_id as string,
      entryId: row.entry_id as string,
      bucket: (row.bucket as string) ?? '',
      path: (row.path as string) ?? '',
      mimeType: (row.mime_type as string) ?? null,
      byteSize: (row.byte_size as number) ?? null,
      uploadStatus: 'uploaded' as UploadStatus,
      metadata: sanitizeMetadata(row.metadata),
    } as unknown as Partial<Attachment>;
  }
}
