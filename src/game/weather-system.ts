/**
 * src/game/weather-system.ts
 * Dynamic weather and environmental effects for D&D campaigns in DMLog.ai
 */

export type WeatherType = 
  | 'Clear' | 'Cloudy' | 'Rain' | 'Heavy Rain' | 'Thunderstorm' 
  | 'Snow' | 'Blizzard' | 'Fog' | 'Strong Winds' | 'Extreme Heat' 
  | 'Extreme Cold' | 'Magical Storm' | 'Acid Rain' | 'Ash Fall';

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
export type BiomeSetting = 'Temperate' | 'Desert' | 'Arctic' | 'Tropical' | 'Wasteland';

export interface WeatherEvent {
  id: string;
  type: WeatherType;
  intensity: number; // 1 (mild) to 10 (extreme)
  temperature: number; // in Fahrenheit
  visibility: number; // percentage 0-100
  effects: string[];
  duration: number; // in hours
  description: string;
}

export class WeatherSystem {
  private current!: WeatherEvent;
  private forecast: WeatherEvent[] = [];
  private history: WeatherEvent[] = [];
  private setting: BiomeSetting = 'Temperate';
  private season: Season = 'Spring';

  constructor(setting?: BiomeSetting) {
    this.initialize(setting || 'Temperate');
  }

  // 1. getCurrent
  public getCurrent(): WeatherEvent {
    return this.current;
  }

  // 2. setWeather
  public setWeather(type: WeatherType, intensity: number, temperature: number, duration: number = 8): void {
    if (this.current) {
      this.history.unshift({ ...this.current });
    }
    this.current = this.generateEventDetails(type, intensity, temperature, duration);
  }

  // 3. advance
  public advance(hours: number): void {
    let remainingHours = hours;
    
    while (remainingHours > 0) {
      if (this.current.duration > remainingHours) {
        this.current.duration -= remainingHours;
        remainingHours = 0;
      } else {
        remainingHours -= this.current.duration;
        this.history.unshift({ ...this.current });
        
        if (this.forecast.length > 0) {
          this.current = this.forecast.shift()!;
        } else {
          this.current = this.rollWeatherEvent();
        }
      }
    }
  }

  // 4. getForecast
  public getForecast(hours: number): WeatherEvent[] {
    let forecastedHours = this.forecast.reduce((acc, ev) => acc + ev.duration, 0);
    
    while (forecastedHours < hours) {
      const nextEvent = this.rollWeatherEvent();
      this.forecast.push(nextEvent);
      forecastedHours += nextEvent.duration;
    }
    
    return this.forecast;
  }

  // 5. getHistory
  public getHistory(days: number): WeatherEvent[] {
    const targetHours = days * 24;
    let accumulatedHours = 0;
    const result: WeatherEvent[] = [];

    for (const event of this.history) {
      if (accumulatedHours >= targetHours) break;
      result.push(event);
      accumulatedHours += event.duration;
    }
    return result;
  }

  // 6. getTemperature
  public getTemperature(): number {
    return this.current.temperature;
  }

  // 7. getVisibility
  public getVisibility(): string {
    const vis = this.current.visibility;
    if (vis >= 80) return 'Clear';
    if (vis >= 40) return 'Lightly Obscured';
    if (vis >= 10) return 'Heavily Obscured';
    return 'Blind';
  }

  // 8. getMovementPenalty
  public getMovementPenalty(): number {
    const type = this.current.type;
    if (['Blizzard', 'Acid Rain', 'Magical Storm'].includes(type)) return 0.25; // 1/4 speed
    if (['Heavy Rain', 'Snow', 'Strong Winds', 'Ash Fall'].includes(type)) return 0.5; // 1/2 speed
    if (['Rain', 'Fog', 'Extreme Heat', 'Extreme Cold'].includes(type)) return 0.75; // 3/4 speed
    return 1.0; // Normal speed
  }

  // 9. getCombatEffects
  public getCombatEffects(): string[] {
    return this.current.effects;
  }

  // 10. getSurvivalDC
  public getSurvivalDC(): number {
    let dc = 10 + Math.floor(this.current.intensity / 2);
    if (this.current.temperature > 100 || this.current.temperature < 0) dc += 5;
    if (this.isDangerous()) dc += 5;
    return dc;
  }

  // 11. rollWeatherEvent
  public rollWeatherEvent(): WeatherEvent {
    const types = this.getSettingWeatherWeights();
    const roll = Math.random();
    let cumulative = 0;
    let selectedType: WeatherType = 'Clear';

    for (const [type, weight] of Object.entries(types)) {
      cumulative += weight;
      if (roll <= cumulative) {
        selectedType = type as WeatherType;
        break;
      }
    }

    const intensity = Math.floor(Math.random() * 10) + 1;
    const baseTemp = this.getBaseTemperature();
    const tempVariance = Math.floor(Math.random() * 20) - 10;
    const duration = Math.floor(Math.random() * 12) + 4; // 4 to 15 hours

    return this.generateEventDetails(selectedType, intensity, baseTemp + tempVariance, duration);
  }

  // 12. isDangerous
  public isDangerous(): boolean {
    const dangerousTypes: WeatherType[] = ['Blizzard', 'Thunderstorm', 'Extreme Heat', 'Extreme Cold', 'Magical Storm', 'Acid Rain', 'Ash Fall'];
    return dangerousTypes.includes(this.current.type) || this.current.intensity >= 8;
  }

  // 13. getWeatherDescription
  public getWeatherDescription(): string {
    return this.current.description;
  }

  // 14. transition
  public transition(from: WeatherEvent, to: WeatherEvent): string {
    if (from.type === to.type) return `The ${to.type.toLowerCase()} continues, shifting slightly in intensity.`;
    
    if (from.type === 'Clear' && to.type === 'Rain') return 'Dark clouds gather rapidly, and the first heavy drops of rain begin to fall.';
    if (from.type === 'Rain' && to.type === 'Clear') return 'The rain tapers off as the clouds part, revealing clear skies.';
    if (to.type === 'Magical Storm') return 'The air crackles with arcane energy as the sky twists into unnatural, vibrant colors.';
    if (to.type === 'Blizzard') return 'The temperature plummets instantly as howling winds carry a blinding wall of white snow.';
    
    return `The ${from.type.toLowerCase()} gradually gives way to ${to.type.toLowerCase()}.`;
  }

  // 15. getSeason
  public getSeason(): Season {
    return this.season;
  }

  public setSeason(season: Season): void {
    this.season = season;
  }

  // 16. affectSpell
  public affectSpell(spellType: string): string {
    const type = this.current.type;
    const st = spellType.toLowerCase();

    if (st === 'fire' && ['Rain', 'Heavy Rain', 'Thunderstorm'].includes(type)) {
      return 'Fire damage is reduced by 1d4 per spell level. Unprotected flames are extinguished.';
    }
    if (st === 'lightning' && type === 'Thunderstorm') {
      return 'Lightning spells deal an additional 1d6 damage and their AoE is increased by 5 feet.';
    }
    if (st === 'cold' && ['Snow', 'Blizzard', 'Extreme Cold'].includes(type)) {
      return 'Cold spells have their saving throw DC increased by 1.';
    }
    if (st === 'illusion' && ['Fog', 'Blizzard', 'Heavy Rain'].includes(type)) {
      return 'Visual illusions are harder to discern; Investigation checks to see through them have disadvantage.';
    }
    return 'The weather has no significant effect on this magic.';
  }

  // 17. getEncounterChance
  public getEncounterChance(): number {
    let baseChance = 15; // 15% base chance
    if (this.isDangerous()) baseChance += 20; // Creatures seeking shelter or elemental predators
    if (this.current.visibility < 50) baseChance += 10; // Ambush predators
    if (this.current.type === 'Magical Storm') baseChance += 35; // Arcane anomalies
    return Math.min(baseChance, 80);
  }

  // 18. getLoot
  public getLoot(): string {
    const type = this.current.type;
    if (type === 'Thunderstorm' && this.current.intensity > 7) return 'Fulgurite Crystal (1d4)';
    if (type === 'Magical Storm') return 'Vial of Storm Essence (1)';
    if (type === 'Acid Rain') return 'Flask of Corrosive Dew (1)';
    if (type === 'Ash Fall') return 'Pouch of Volcanic Ash (Component for fire spells)';
    if (type === 'Blizzard' && this.current.intensity > 8) return 'True-Ice Shard (1)';
    return 'None';
  }

  // 19. serialize / deserialize
  public serialize(): string {
    return JSON.stringify({
      current: this.current,
      forecast: this.forecast,
      history: this.history,
      setting: this.setting,
      season: this.season
    });
  }

  public deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.current = parsed.current;
    this.forecast = parsed.forecast;
    this.history = parsed.history;
    this.setting = parsed.setting;
    this.season = parsed.season;
  }

  // 20. initialize
  public initialize(setting: BiomeSetting): void {
    this.setting = setting;
    this.forecast = [];
    this.history = [];
    this.current = this.rollWeatherEvent();
  }

  // --- Private Helper Methods ---

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private generateEventDetails(type: WeatherType, intensity: number, temperature: number, duration: number): WeatherEvent {
    let visibility = 100;
    let effects: string[] = [];
    let description = '';

    switch (type) {
      case 'Clear':
        description = 'The sky is clear and the weather is calm.';
        break;
      case 'Cloudy':
        visibility = 90;
        description = 'Overcast skies block out direct sunlight.';
        break;
      case 'Rain':
        visibility = 70;
        effects.push('Disadvantage on Wisdom (Perception) checks relying on hearing.');
        description = 'A steady rainfall blankets the area.';
        break;
      case 'Heavy Rain':
        visibility = 30;
        effects.push('Disadvantage on Wisdom (Perception) checks relying on sight or hearing.', 'Ranged weapon attacks have disadvantage.');
        description = 'Torrential rain pours from the sky, washing away tracks and obscuring vision.';
        break;
      case 'Thunderstorm':
        visibility = 40;
        effects.push('Ranged weapon attacks have disadvantage.', '10% chance per hour of lightning striking a random tall object/creature.');
        description = 'Fierce winds, heavy rain, and booming thunder crash through the area.';
        break;
      case 'Snow':
        visibility = 60;
        effects.push('Tracks are covered within 1 hour.');
        description = 'Gentle snowfall covers the landscape in white.';
        break;
      case 'Blizzard':
        visibility = 5;
        effects.push('Creatures are Blinded beyond 10 feet.', 'Disadvantage on Constitution saves to maintain concentration.', 'Exhaustion checks required every hour.');
        description = 'A lethal combination of freezing temperatures and blinding snow.';
        break;
      case 'Fog':
        visibility = 15;
        effects.push('Creatures are Heavily Obscured beyond 20 feet.');
        description = 'A thick, clinging mist reduces visibility to a mere few paces.';
        break;
      case 'Strong Winds':
        visibility = 80;
        effects.push('Flying creatures must land or fall at the end of their turn.', 'Ranged weapon attacks have disadvantage.');
        description = 'Gale-force winds whip through the area, making travel difficult.';
        break;
      case 'Extreme Heat':
        effects.push('Creatures exposed to the heat must succeed on a Constitution save every hour or gain exhaustion.', 'Water requirements are doubled.');
        description = 'The air shimmers with oppressive, baking heat.';
        break;
      case 'Extreme Cold':
        effects.push('Creatures without cold weather gear must succeed on a Constitution save every hour or gain exhaustion.');
        description = 'A bone-chilling cold settles over the region, freezing water instantly.');
        break;
      case 'Magical Storm':
        visibility = 20;
        effects.push('Wild Magic Surge triggers on any spell cast of 1st level or higher.', 'Unprotected creatures take 1d4 force damage per hour.');
        description = 'Arcane energies violently rupture the sky, raining raw magic.';
        break;
      case 'Acid Rain':
        visibility = 40;
        effects.push('Unprotected creatures take 1d4 acid damage every 10 minutes.', 'Non-magical metal and wood degrade over time.');
        description = 'Sickly green clouds drop a caustic downpour that hisses as it hits the ground.';
        break;
      case 'Ash Fall':
        visibility = 25;
        effects.push('Creatures without breathing protection must save vs Poison or begin suffocating.', 'Everything is coated in a thick layer of grey ash.');
        description = 'Flakes of grey ash fall like snow, choking the air and blotting out the sun.';
        break;
    }

    return {
      id: this.generateId(),
      type,
      intensity,
      temperature,
      visibility,
      effects,
      duration,
      description
    };
  }

  private getBaseTemperature(): number {
    const seasonMods = { Spring: 60, Summer: 85, Autumn: 55, Winter: 25 };
    const biomeMods = { Temperate: 0, Desert: 30, Arctic: -40, Tropical: 20, Wasteland: 10 };
    return seasonMods[this.season] + biomeMods[this.setting];
  }

  private getSettingWeatherWeights(): Record<string, number> {
    // Returns probabilities summing to 1.0 based on biome
    switch (this.setting) {
      case 'Desert':
        return { 'Clear': 0.6, 'Extreme Heat': 0.2, 'Strong Winds': 0.15, 'Rain': 0.05 };
      case 'Arctic':
        return { 'Clear': 0.3, 'Snow': 0.3, 'Blizzard': 0.2, 'Extreme Cold': 0.15, 'Fog': 0.05 };
      case 'Tropical':
        return { 'Clear': 0.2, 'Rain': 0.3, 'Heavy Rain': 0.3, 'Thunderstorm': 0.15, 'Extreme Heat': 0.05 };
      case 'Wasteland':
        return { 'Cloudy': 0.3, 'Fog': 0.2, 'Acid Rain': 0.2, 'Ash Fall': 0.15, 'Magical Storm': 0.15 };
      case 'Temperate':
      default:
        return { 'Clear': 0.4, 'Cloudy': 0.2, 'Rain': 0.15, 'Fog': 0.1, 'Strong Winds': 0.05, 'Thunderstorm': 0.05, 'Snow': 0.05 };
    }
  }
}