import { DailyRecord } from '../entities/DailyRecord';

export interface IDailyRecordRepository {
  create(record: DailyRecord): Promise<DailyRecord>;
  findById(id: number): Promise<DailyRecord | null>;
  findByPlantId(plantId: number): Promise<DailyRecord[]>;
  update(id: number, data: Partial<DailyRecord>): Promise<DailyRecord>;
  delete(id: number): Promise<void>;
}
