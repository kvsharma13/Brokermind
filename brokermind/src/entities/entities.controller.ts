import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EntitiesService } from './entities.service';

@Controller('api/entities')
export class EntitiesController {
  constructor(private entities: EntitiesService) {}

  @Get(':name')
  list(
    @Param('name') name: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
  ) {
    return this.entities.list(name, sort, limit ? Number(limit) : undefined);
  }

  // Filter — body is the raw `where` object. Kept as POST because GET cannot
  // carry a structured body and the legacy SDK signature was `.filter(where, sort)`.
  @Post(':name/query')
  filter(
    @Param('name') name: string,
    @Body() where: Record<string, any>,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
  ) {
    return this.entities.filter(name, where || {}, sort, limit ? Number(limit) : undefined);
  }

  @Get(':name/:id')
  get(@Param('name') name: string, @Param('id') id: string) {
    return this.entities.get(name, id);
  }

  @Post(':name')
  create(@Param('name') name: string, @Body() data: Record<string, any>) {
    return this.entities.create(name, data);
  }

  @Patch(':name/:id')
  update(
    @Param('name') name: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
  ) {
    return this.entities.update(name, id, data);
  }

  @Delete(':name/:id')
  remove(@Param('name') name: string, @Param('id') id: string) {
    return this.entities.remove(name, id);
  }
}
