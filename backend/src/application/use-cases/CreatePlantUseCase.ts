import { IPlantRepository } from '../../domain/repositories/IPlantRepository';
import { CreatePlantDTO, PlantResponseDTO } from '../dtos/PlantDTO';
import { PlantEntity } from '../../domain/entities/Plant';
import { ValidationError } from '../../shared/errors/AppError';

export class CreatePlantUseCase {
  constructor(private plantRepository: IPlantRepository) {}

  async execute(data: CreatePlantDTO): Promise<PlantResponseDTO> {
    // Validações
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Nome da planta é obrigatório');
    }

    if (!data.genetic || data.genetic.trim().length === 0) {
      throw new ValidationError('Genética é obrigatória');
    }

    if (!data.planting_date) {
      throw new ValidationError('Data de plantio é obrigatória');
    }

    if (!data.substrate) {
      throw new ValidationError('Substrato é obrigatório');
    }

    if (!data.current_location) {
      throw new ValidationError('Localização é obrigatória');
    }

    // Verificar se código já existe
    if (data.code) {
      const existingPlant = await this.plantRepository.findByCode(data.code);
      if (existingPlant) {
        throw new ValidationError(`Código ${data.code} já está em uso`);
      }
    }

    // Calcular dias de germinação se tiver data de germinação
    let days_to_germination: number | undefined;
    if (data.germination_date) {
      const planting = new Date(data.planting_date);
      const germination = new Date(data.germination_date);
      days_to_germination = Math.floor(
        (germination.getTime() - planting.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const plant = new PlantEntity({
      ...data,
      days_to_germination,
      current_phase: 'germinacao',
      status: 'ativa',
    });

    const createdPlant = await this.plantRepository.create(plant);
    
    return this.mapToResponse(createdPlant);
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
