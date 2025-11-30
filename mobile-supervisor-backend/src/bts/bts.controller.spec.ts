import { Test, TestingModule } from '@nestjs/testing';
import { BtsController } from './bts.controller';

describe('BtsController', () => {
  let controller: BtsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BtsController],
    }).compile();

    controller = module.get<BtsController>(BtsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
