import { Document, Types } from 'mongoose';
import { AbiItem } from 'web3-utils';
import { PastEventOptions, EventData } from 'web3-eth-contract';
import { StandardInterface, EventOptions } from '../config/abi/types';

// schema types
export interface IContractSchema {
  address: string;
  network: string;
  latestBlock: number;
  events: string[];
  jsonInterface: AbiItem | AbiItem[];
}
export interface IEventSchema {
  address: string;
  rpc: string;
  blockNumber: number;
  transactionHash: string;
  event: string;
  returnValues: {
    [key: string]: any;
  };
}

// classes interface
export interface IDatabase {
  getContracts: () =>
    | Promise<
        (Document<unknown, any, IContractSchema> &
          IContractSchema & {
            _id: Types.ObjectId;
          })[]
      >
    | Promise<IContractSchema[]>
    | IContractSchema[];
  isExistContract: (address: string) => Promise<boolean>;
  insertContract: (data: IContractSchema) => void;
  updateContract({
    address,
    latestBlock,
    events,
    jsonInterface,
  }: IContractSchema): void;
  insertEvent: (data: IEventSchema) => void;
  insertEvents: (data: IEventSchema[]) => void;
  eventHandler: (data: IEventSchema | IEventSchema[]) => void;
}

export interface IListen {
  getJsonInterface: () => AbiItem | AbiItem[];
  loadPastEvents: (
    event: string,
    eventHandler: (data: EventData | EventData[]) => void,
    eventOptions?: PastEventOptions,
  ) => void;
  listen: (
    event: keyof StandardInterface['events'],
    eventHandler: (data: EventData) => void,
    eventOptions?: EventOptions,
  ) => void;
}

// returning types
export interface IReturn {
  success: boolean;
  msg: string;
}
