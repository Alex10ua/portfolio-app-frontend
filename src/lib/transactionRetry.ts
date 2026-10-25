/** Keep an uncertain write's key through network and manual retries. A confirmed save
 * releases it, allowing a later, intentional transaction with identical details. */
export class TransactionRetryKeys {
  private pending = new Map<string, string>();

  signature(portfolioId: string, payload: object): string {
    return JSON.stringify([portfolioId, Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))]);
  }

  get(signature: string): string {
    let key = this.pending.get(signature);
    if (!key) {
      // getRandomValues also works when the SPA is served over plain HTTP on a LAN.
      key = Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, '0')).join('');
      this.pending.set(signature, key);
    }
    return key;
  }

  complete(signature: string, key: string): void {
    if (this.pending.get(signature) === key) this.pending.delete(signature);
  }
}
