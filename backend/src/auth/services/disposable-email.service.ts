import fs from 'node:fs/promises';
import path from 'node:path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class DisposableEmailService implements OnModuleInit {
  private readonly logger = new Logger(DisposableEmailService.name);
  private domains = new Set<string>();

  public async onModuleInit(): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), 'disposable_emails.txt');
      const contents = await fs.readFile(filePath, 'utf8');
      const domains = contents
        .split('\n')
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      this.domains = new Set(domains);
      this.logger.log(`Loaded ${String(this.domains.size)} disposable email domains.`);
    } catch (error) {
      this.logger.warn(
        'Could not load disposable email domains. Proceeding without checks.',
        String(error),
      );
    }
  }

  public contains(email: string): boolean {
    const atIndex = email.lastIndexOf('@');

    if (atIndex === -1) {
      return false;
    }

    return this.domains.has(email.slice(atIndex + 1).toLowerCase());
  }
}
