import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseSort, resolveEntity } from './entity-registry';

function nowIso() {
  return new Date().toISOString();
}

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  private delegate(name: string): any {
    const key = resolveEntity(name);
    if (!key) throw new BadRequestException(`Unknown entity: ${name}`);
    const delegate = (this.prisma as any)[key];
    if (!delegate) throw new BadRequestException(`Prisma model not registered: ${name}`);
    return delegate;
  }

  async list(name: string, sort?: string, limit?: number) {
    return this.delegate(name).findMany({
      orderBy: parseSort(sort),
      take: limit && Number.isFinite(limit) ? limit : undefined,
    });
  }

  async filter(name: string, where: Record<string, any>, sort?: string, limit?: number) {
    return this.delegate(name).findMany({
      where: where || {},
      orderBy: parseSort(sort),
      take: limit && Number.isFinite(limit) ? limit : undefined,
    });
  }

  async get(name: string, id: string) {
    const rec = await this.delegate(name).findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`${name} ${id} not found`);
    return rec;
  }

  async create(name: string, data: Record<string, any>) {
    const payload: Record<string, any> = { ...data, created_date: nowIso(), updated_date: nowIso() };
    delete payload.id;
    return this.delegate(name).create({ data: payload });
  }

  async update(name: string, id: string, data: Record<string, any>) {
    const payload: Record<string, any> = { ...data, updated_date: nowIso() };
    delete payload.id;
    delete payload.created_date;
    return this.delegate(name).update({ where: { id }, data: payload });
  }

  async remove(name: string, id: string) {
    await this.delegate(name).delete({ where: { id } });
    return { success: true };
  }
}
