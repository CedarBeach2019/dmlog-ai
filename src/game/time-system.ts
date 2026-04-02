// src/game/time-system.ts

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  year: number;
  era: string;
}

export interface TimeEvent {
  id: string;
  time: GameTime;
  description: string;
  type: 'dawn' | 'dusk' | 'midnight' | 'noon' | 'festival' | 'eclipse' | 'full_moon' | 'new_moon';
  recurring: boolean;
  intervalDays?: number;
}

export class TimeSystem {
  private totalMinutes: number = 0;
  private year: number = 1;
  private era: string = 'First Age';
  private events: TimeEvent[] = [];
  private activeEvents: TimeEvent[] = [];

  constructor(initialTime?: Partial<GameTime>) {
    if (initialTime) {
      this.year = initialTime.year ?? 1;
      this.era = initialTime.era ?? 'First Age';
      const seasonOffset = { spring: 0, summer: 90, autumn: 180, winter: 270 };
      const baseDay = seasonOffset[initialTime.season ?? 'spring'] ?? 0;
      this.totalMinutes = ((baseDay + (initialTime.day ?? 1) - 1) * 24 * 60) + ((initialTime.hour ?? 0) * 60) + (initialTime.minute ?? 0);
    }
  }

  private calcTime(): GameTime {
    const yearMins = 360 * 24 * 60;
    const total = this.totalMinutes;
    this.year = Math.floor(total / yearMins) + 1;
    
    const dayInYear = Math.floor((total % yearMins) / (24 * 60)) + 1;
    let season: GameTime['season'] = 'winter';
    if (dayInYear <= 90) season = 'spring';
    else if (dayInYear <= 180) season = 'summer';
    else if (dayInYear <= 270) season = 'autumn';
    
    return {
      year: this.year,
      era: this.era,
      day: dayInYear,
      hour: Math.floor((total % (24 * 60)) / 60),
      minute: total % 60,
      season
    };
  }

  advance(minutes: number): GameTime {
    this.activeEvents = [];
    const end = this.totalMinutes + minutes;
    
    for (const ev of this.events) {
      const evMins = this.dateToMins(ev.time);
      if (evMins >= this.totalMinutes && evMins < end) {
        this.activeEvents.push(ev);
        if (ev.recurring && ev.intervalDays) {
          ev.time = this.minsToDate(evMins + ev.intervalDays * 24 * 60);
        }
      }
    }
    
    this.totalMinutes = end;
    return this.calcTime();
  }

  advanceHours(hours: number): GameTime { return this.advance(hours * 60); }
  advanceDays(days: number): GameTime { return this.advance(days * 24 * 60); }
  getTime(): GameTime { return this.calcTime(); }

  setTimeOfDay(): 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight' {
    const h = this.calcTime().hour;
    if (h === 5 || h === 6) return 'dawn';
    if (h >= 7 && h <= 11) return 'morning';
    if (h === 12) return 'midday';
    if (h >= 13 && h <= 16) return 'afternoon';
    if (h === 17 || h === 18) return 'dusk';
    if (h >= 19 && h <= 21) return 'evening';
    if (h >= 22 || h <= 3) return 'night';
    return 'midnight';
  }

  isDaytime(): boolean { const h = this.calcTime().hour; return h >= 6 && h < 18; }
  getSeason(): string { return this.calcTime().season; }

  getMoonPhase(): 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent' {
    const phaseIndex = Math.floor((this.calcTime().day % 30) / 30 * 8);
    const phases = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'] as const;
    return phases[phaseIndex];
  }

  addTimeEvent(event: TimeEvent): void { this.events.push(event); this.events.sort((a, b) => this.dateToMins(a.time) - this.dateToMins(b.time)); }

  getUpcomingEvents(count: number): TimeEvent[] {
    const current = this.totalMinutes;
    return this.events.filter(e => this.dateToMins(e.time) > current).slice(0, count);
  }

  getActiveEvents(): TimeEvent[] { return [...this.activeEvents]; }

  getWeather(day?: number): string {
    const targetDay = day ?? this.calcTime().day;
    const seed = (targetDay * 9301 + 49297) % 233280;
    const rand = seed / 233280;
    const season = this.calcTime().season;
    const weights = {
      spring: { 'Rain': 0.4, 'Clear': 0.3, 'Overcast': 0.2, 'Thunderstorm': 0.1 },
      summer: { 'Clear': 0.5, 'Hot & Humid': 0.3, 'Rain': 0.1, 'Thunderstorm': 0.1 },
      autumn: { 'Clear': 0.3, 'Overcast': 0.3, 'Rain': 0.2, 'Fog': 0.1, 'High Winds': 0.1 },
      winter: { 'Snow': 0.4, 'Clear': 0.2, 'Overcast': 0.2, 'Blizzard': 0.1, 'Freezing Rain': 0.1 }
    };
    let cumulative = 0;
    for (const [weather, weight] of Object.entries(weights[season])) {
      cumulative += weight;
      if (rand < cumulative) return weather;
    }
    return 'Clear';
  }

  getTimeDescription(): string {
    const time = this.calcTime();
    const period = this.setTimeOfDay();
    const moon = this.getMoonPhase();
    const weather = this.getWeather();
    return `It is a ${weather.toLowerCase()} ${period} in ${time.season}, Day ${time.day} of ${time.era} Year ${time.year}. The ${moon.replace('_', ' ')} moon hangs in the sky.`;
  }

  getDateString(): string {
    const time = this.calcTime();
    return `${time.season.charAt(0).toUpperCase() + time.season.slice(1)} ${time.day}, Year ${time.year} (${time.era})`;
  }

  daysBetween(a: GameTime, b: GameTime): number {
    return Math.abs(this.dateToMins(a) - this.dateToMins(b)) / (24 * 60);
  }

  private dateToMins(time: GameTime): number {
    const seasonOffset = { spring: 0, summer: 90, autumn: 180, winter: 270 };
    return (((time.year - 1) * 360) + seasonOffset[time.season] + time.day - 1) * 24 * 60 + (time.hour * 60) + time.minute;
  }

  private minsToDate(totalMins: number): GameTime {
    const yearMins = 360 * 24 * 60;
    const yr = Math.floor(totalMins / yearMins) + 1;
    const dayInYear = Math.floor((totalMins % yearMins) / (24 * 60)) + 1;
    let season: GameTime['season'] = 'winter';
    if (dayInYear <= 90) season = 'spring';
    else if (dayInYear <= 180) season = 'summer';
    else if (dayInYear <= 270) season = 'autumn';
    return { year: yr, era: this.era, day: dayInYear, hour: Math.floor((totalMins % (24 * 60)) / 60), minute: totalMins % 60, season };
  }

  serialize(): object { return { totalMinutes: this.totalMinutes, era: this.era, events: this.events, year: this.year }; }
  
  deserialize(data: any): void {
    this.totalMinutes = data.totalMinutes;
    this.era = data.era;
    this.year =