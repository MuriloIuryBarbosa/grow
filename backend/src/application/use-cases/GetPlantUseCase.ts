import { IPlantRepository } from '../../domain/repositories/IPlantRepository';
import { PlantResponseDTO } from '../dtos/PlantDTO';
import { NotFoundError } from '../../shared/errors/AppError';
import { PlantEntity } from '../../domain/entities/Plant';

export class GetPlantUseCase {
  constructor(private plantRepository: IPlantRepository) {}

  async execute(identifier: string): Promise<PlantResponseDTO> {
    let plant;

    // Tentar buscar por ID primeiro
    if (!isNaN(Number(identifier))) {
      plant = await this.plantRepository.findById(Number(identifier));
    }

    // Se não encontrou, tentar por código
    if (!plant) {
      plant = await this.plantRepository.findByCode(identifier);
    }

    if (!plant) {
      throw new NotFoundError('Planta');
    }

    return this.mapToResponse(plant);
  }

  private mapToResponse(plant: any): PlantResponseDTO {
    const entity = new PlantEntity(plant);
    return {
      ...plant,
      days_in_phase: entity.getDaysInCurrentPhase(),
      total_growth_days: entity.getTotalGrowthDays(),
    };
  }
}
