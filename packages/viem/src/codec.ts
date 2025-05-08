import { AbiCodec, Result } from '@holdstation/worldchain-sdk'
import { Abi, decodeFunctionResult, encodeFunctionData as viemEncode } from 'viem'

export class ViemCodec implements AbiCodec {
  constructor(private abi: Abi) {}

  encodeFunctionData(fnName: string, args: unknown[] = []): string {
    return viemEncode({ abi: this.abi, functionName: fnName, args })
  }

  decodeFunctionResult(fnName: string, data: string): Result {
    const fn = this.abi.find((f) => f.type === 'function' && f.name === fnName)
    if (!fn || !('outputs' in fn)) {
      throw new Error(`Function ${fnName} not found in ABI`)
    }
    const decoded = decodeFunctionResult({
      abi: this.abi,
      functionName: fnName as any,
      data: data as `0x${string}`,
    })

    const keys = fn.outputs?.map((o) => o.name || '') ?? []
    if (keys.length === 1) {
      return [decoded as any]
    }
    // Viem doesn't return {result}, it returns the result directly
    const values = decoded as any[]

    return this.toResult(values, keys)
  }

  private toResult(values: any[], keys: string[]): Result {
    // Create a new object with both array-like and named properties
    const resultObj: Record<string | number, any> = {}

    // Add array indices
    values.forEach((val, i) => {
      resultObj[i] = val
    })

    // Add named properties
    keys.forEach((key, i) => {
      if (key) {
        // Only add if key name exists
        resultObj[key] = values[i]
      }
    })

    // Add length property
    resultObj.length = values.length

    // Use Object.assign to cast to Result
    return Object.assign(values.slice(), resultObj) as unknown as Result
  }
}
