import { Plant } from '../entities/Plant';

export interface IPlantRepository {
  create(plant: Plant): Promise<Plant>;
  findById(id: number): Promise<Plant | null>;
  findByCode(code: string): Promise<Plant | null>;
  findAll(filters?: { status?: string }): Promise<Plant[]>;
  update(id: number, data: Partial<Plant>): Promise<Plant>;
  delete(id: number): Promise<void>;
  updateStatus(id: number, status: string, failureDate?: string, failureReason?: string): Promise<Plant>;
  updatePhoto(id: number, photoPath: string): Promise<Plant>;
}
