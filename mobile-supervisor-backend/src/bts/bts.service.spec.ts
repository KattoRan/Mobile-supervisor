import { Test, TestingModule } from '@nestjs/testing';
import { BtsService } from './bts.service';

describe('BtsService', () => {
  let service: BtsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BtsService],
    }).compile();

    service = module.get<BtsService>(BtsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
