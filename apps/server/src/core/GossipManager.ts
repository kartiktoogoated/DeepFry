import { Validator, Vote, Status } from "./Validator";
import { info } from "../../utils/logger";

export class GossipManager {
  private validators: Validator[];
  private rounds: number;
  private location: string;

  constructor(
    validators: Validator[],
    rounds: number,
    location: string
  ) {
    this.validators = validators;
    this.rounds = rounds;
    this.location = location;
  }

  /**
   * Runs N rounds of gossip. In each round every validator
   * re-sends its last vote (with timestamp, latency & location) to peers.
   */
  public async runGossipRounds(
    siteUrl: string,
    responseTime: number,
    timestamp: string
  ): Promise<void> {
    for (let round = 1; round <= this.rounds; round++) {
      info(`Starting gossip round ${round} for ${siteUrl}`);
      
      await Promise.all(
        this.validators.map((validator) =>
          validator.gossip(
            siteUrl,
            responseTime,
            timestamp,
            this.location
          )
        )
      );
      const delayMs = this.getRandomDelay(500, 1500);
      await this.delay(delayMs);
      info(`Completed gossip round ${round} (delay ${delayMs}ms)`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
