import { IsNumber, IsOptional, IsString, IsISO8601 } from 'class-validator';

export class UpPositionDto {
  @IsOptional() @IsString() deviceId?: string; // UUID hoặc mã tuỳ bạn
  @IsOptional() @IsString() phoneNumber?: string; // fallback cách định danh

  @IsNumber() latitude: number;
  @IsNumber() longitude: number;

  @IsOptional() @IsISO8601() isoTimestamp?: string; // nếu không có, server dùng now()

  @IsOptional() @IsNumber() cid?: number;
  @IsOptional() @IsNumber() lac?: number;
  @IsOptional() @IsNumber() mcc?: number;
  @IsOptional() @IsNumber() mnc?: number;
}
