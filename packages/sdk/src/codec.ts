export interface AbiCodec {
  encodeFunctionData(fnName: string, args?: unknown[]): string;
  decodeFunctionResult(fnName: string, data: string): Result;
}

export interface Result extends ReadonlyArray<any> {
  readonly [key: string]: any;
}
