export interface DailyRecord {
  id?: number;
  plant_id: number;
  record_date: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
  fertilization?: string;
  observations?: string;
  location?: string;
  photo_path?: string;
  created_at?: string;
}

export class DailyRecordEntity implements DailyRecord {
  id?: number;
  plant_id: number;
  record_date: string;
  plant_size?: number;
  leaf_count?: number;
  branch_count?: number;
  temperature?: number;
  humidity?: number;
  ppfd?: number;
  vpd?: number;
  fertilization?: string;
  observations?: string;
  location?: string;
  photo_path?: string;
  created_at?: string;

  constructor(data: DailyRecord) {
    this.id = data.id;
    this.plant_id = data.plant_id;
    this.record_date = data.record_date;
    this.plant_size = data.plant_size;
    this.leaf_count = data.leaf_count;
    this.branch_count = data.branch_count;
    this.temperature = data.temperature;
    this.humidity = data.humidity;
    this.ppfd = data.ppfd;
    this.vpd = data.vpd;
    this.fertilization = data.fertilization;
    this.observations = data.observations;
    this.location = data.location;
    this.photo_path = data.photo_path;
    this.created_at = data.created_at;
  }

  hasPhoto(): boolean {
    return !!this.photo_path;
  }

  isComplete(): boolean {
    return !!(
      this.plant_size &&
      this.leaf_count &&
      this.temperature &&
      this.humidity
    );
  }

  hasEnvironmentalData(): boolean {
    return !!(this.temperature || this.humidity || this.ppfd || this.vpd);
  }

  hasGrowthData(): boolean {
    return !!(this.plant_size || this.leaf_count || this.branch_count);
  }
}
