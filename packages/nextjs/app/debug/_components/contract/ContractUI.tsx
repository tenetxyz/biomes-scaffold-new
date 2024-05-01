"use client";

// @refresh reset
import { useReducer } from "react";
import { ContractReadMethods } from "./ContractReadMethods";
import { ContractVariables } from "./ContractVariables";
import { ContractWriteMethods } from "./ContractWriteMethods";
import { Address, Balance } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { ContractName } from "~~/utils/scaffold-eth/contract";

type ContractUIProps = {
  contractName: ContractName;
  className?: string;
};

/**
 * UI component to interface with deployed contracts.
 **/
export const ContractUI = ({ contractName, className = "" }: ContractUIProps) => {
  const [refreshDisplayVariables, triggerRefreshDisplayVariables] = useReducer(value => !value, false);
  const { targetNetwork } = useTargetNetwork();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo(contractName);
  const networkColor = useNetworkColor();

  if (deployedContractLoading) {
    return (
      <div className="mt-14">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!deployedContractData) {
    return (
      <p className="text-3xl mt-14">
        {`No contract found by the name of "${contractName}" on chain "${targetNetwork.name}"!`}
      </p>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-6 px-6 lg:px-10 lg:gap-12 w-full max-w-7xl my-0 ${className}`}>
      <div className="col-span-5 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        <div className="col-span-1 flex flex-col">
          <div className="font-mono border-white border rounded-sm px-4 lg:px-6 mb-6 space-y-1 py-4">
            <div className="flex">
              <div className="flex flex-col gap-2">
                <span className="font-bold">{contractName}</span>
                <Address address={deployedContractData.address} />
                <div className="flex gap-1 items-center">
                  <span className="font-bold text-sm">Balance:</span>
                  <Balance address={deployedContractData.address} className="px-0 h-1.5 min-h-[0.375rem]" />
                </div>
              </div>
            </div>
            {targetNetwork && (
              <p className="my-0 text-sm">
                <span className="font-bold">Network</span>:{" "}
                <span style={{ color: networkColor }}>{targetNetwork.name}</span>
              </p>
            )}
          </div>
          <div className="rounded-sm px-4 lg:px-6 py-4 font-mono" style={{ backgroundColor: "#160b21" }}>
            <ContractVariables
              refreshDisplayVariables={refreshDisplayVariables}
              deployedContractData={deployedContractData}
            />
          </div>
        </div>
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <div className="z-10">
            <div
              style={{ backgroundColor: "#160b21" }}
              className="rounded-sm border border-white flex flex-col mt-10 relative"
            >
              <div className="h-[5rem] w-[5.5rem] bg-white absolute self-start rounded-sm -top-[38px] -left-[1px] -z-10 py-[0.65rem]">
                <div className="flex items-center justify-center space-x-2">
                  <p className="my-0 text-sm text-black font-mono">CODE</p>
                </div>
              </div>
              <div className="p-5 divide-y divide-base-300 bg-red">
                <a
                  href="https://github.com/tenetxyz/biomes-scaffold/blob/race-to-summit/packages/hardhat/contracts/Game.sol"
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  View Contract Code: Game.sol
                </a>
              </div>
            </div>
          </div>
          <div className="z-10">
            <div
              style={{ backgroundColor: "#160b21" }}
              className="rounded-sm border border-white flex flex-col mt-10 relative"
            >
              <div className="h-[5rem] w-[5.5rem] bg-white absolute self-start rounded-sm -top-[38px] -left-[1px] -z-10 py-[0.65rem]">
                <div className="flex items-center justify-center space-x-2">
                  <p className="my-0 text-sm text-black font-mono">READ</p>
                </div>
              </div>
              <div className="p-5 divide-y divide-base-300 bg-red">
                <ContractReadMethods deployedContractData={deployedContractData} />
              </div>
            </div>
          </div>
          <div className="z-10">
            <div
              style={{ backgroundColor: "#160b21" }}
              className="rounded-sm border border-white flex flex-col mt-10 relative"
            >
              <div className="h-[5rem] w-[5.5rem] bg-white absolute self-start rounded-sm -top-[38px] -left-[1px] -z-10 py-[0.65rem]">
                <div className="flex items-center justify-center space-x-2">
                  <p className="my-0 text-sm text-black font-mono">WRITE</p>
                </div>
              </div>
              <div className="p-5 divide-y divide-base-300">
                <ContractWriteMethods
                  deployedContractData={deployedContractData}
                  onChange={triggerRefreshDisplayVariables}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
