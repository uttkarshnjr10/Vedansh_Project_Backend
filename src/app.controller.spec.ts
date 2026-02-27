import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
      imports: [TerminusModule],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API info', () => {
      const result = appController.getInfo();
      expect(result.name).toBe('VanaAushadhi API');
      expect(result.version).toBe('1.0.0');
      expect(result.status).toBe('running');
    });
  });
});
