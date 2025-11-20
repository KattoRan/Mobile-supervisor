import { IsNotEmpty, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

class CellTowerDto {
  @IsNotEmpty()
  type: string;

  @IsNumber()
  mcc: number;

  @IsNumber()
  mnc: number;

  @IsNumber()
  lac: number;

  @IsNumber()
  cid: number;

  @IsNumber()
  rssi: number;

  @IsNumber()
  signalDbm: number;

  @IsNumber()
  pci: number;
}

export class SubmitDataDto {
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CellTowerDto)
  cellTowers: CellTowerDto[];
}
