import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) { }

  @Public()
  @Get()
  getInfo() {
    return {
      name: 'VanaAushadhi API',
      version: '1.0.0',
      status: 'running',
      docs: '/api/docs',
    };
  }

  @Public()
  @Get('health')
  @HealthCheck()
  async checkHealth() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    let healthResult: any;
    try {
      healthResult = await this.health.check([
        () => this.db.pingCheck('database'),
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      ]);
    } catch (error: any) {
      healthResult = error.response || { status: 'error', details: {} };
    }

    return {
      ...healthResult,
      info: {
        ...healthResult.info,
        uptime: `${Math.floor(uptime)}s`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
        version: '1.0.0',
      },
    };
  }
}
