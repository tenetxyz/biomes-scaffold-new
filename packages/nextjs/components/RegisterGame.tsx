import { useEffect, useReducer } from "react";
import { Abi, AbiFunction } from "abitype";
import { TransactionReceipt } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { DisplayVariable, displayTxResult } from "~~/app/debug/_components/contract";
import { SendEthButton } from "~~/app/debug/_components/contract/SendEthButton";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useGlobalState } from "~~/services/store/store";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

export const RegisterGame: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const isGameRegistered = useGlobalState(({ isGameRegistered }) => isGameRegistered);
  const setIsGameRegistered = useGlobalState(({ setIsGameRegistered }) => setIsGameRegistered);
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [refreshDisplayVariables] = useReducer(value => !value, false);

  const checkPlayerRegistered = async () => {
    if (connectedAddress === undefined || deployedContractData === undefined || deployedContractLoading) {
      setIsGameRegistered(false);
      return;
    }
    if (!publicClient) return;

    const registeredPlayers = await publicClient.readContract({
      address: deployedContractData.address,
      abi: deployedContractData.abi,
      functionName: "getRegisteredPlayers",
      args: undefined,
    });
    if (!Array.isArray(registeredPlayers)) {
      return;
    }
    const isPlayerRegistered = registeredPlayers.some(
      playerAddress => playerAddress.toLowerCase() === connectedAddress.toLowerCase(),
    );
    setIsGameRegistered(isPlayerRegistered);
  };

  useEffect(() => {
    checkPlayerRegistered();
  }, [connectedAddress, deployedContractData, deployedContractLoading]);

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const writeFunctions = ((deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
    .filter(fn => {
      const isWriteableFunction =
        fn.stateMutability !== "view" &&
        fn.stateMutability !== "pure" &&
        fn.name !== "onAfterCallSystem" &&
        fn.name !== "onBeforeCallSystem" &&
        fn.name !== "onRegisterHook" &&
        fn.name !== "onUnregisterHook" &&
        fn.name !== "canUnregister";
      return isWriteableFunction;
    })
    .map(fn => {
      return {
        fn,
        inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[fn.name],
      };
    })
    .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

  const registerPlayFunctionData = writeFunctions.find(fn => fn.fn.name === "registerPlayer");

  const viewFunctions = ((deployedContractData?.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
    .filter(fn => {
      const isQueryableWithNoParams =
        (fn.stateMutability === "view" || fn.stateMutability === "pure") && fn.inputs.length === 0;
      return isQueryableWithNoParams;
    })
    .map(fn => {
      return {
        fn,
        inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[fn.name],
      };
    })
    .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

  const basicGetterFn = viewFunctions.find(({ fn }) => fn.name === "basicGetter");

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div className="grid grid-cols-12 flex flex-1">
        <div className="col-span-12 lg:col-span-9 p-12 flex flex-col justify-between items-center">
          <div style={{ width: "80%" }} className="flex flex-col gap-12">
            <div>
              <h1 className="text-3xl font-bold text-left mt-4">Join Game</h1>
              <h1 className="text-left mt-4" style={{ lineHeight: "normal", margin: "0", wordWrap: "break-word" }}>
                Your Register Game Description
              </h1>
            </div>
            <div>
              {!isGameRegistered ? (
                <div>
                  {registerPlayFunctionData ? (
                    <SendEthButton
                      contractAddress={deployedContractData.address}
                      abi={deployedContractData.abi as Abi}
                      functionName={registerPlayFunctionData.fn.name}
                      value={"0.0015"}
                      onWrite={(txnReceipt: TransactionReceipt) => {
                        console.log("txnReceipt", txnReceipt);
                        checkPlayerRegistered();
                      }}
                    />
                  ) : (
                    <button
                      className="w-full btn btn-primary bg-secondary rounded-sm"
                      onClick={() => setIsGameRegistered(true)}
                    >
                      Mock Game Register
                    </button>
                  )}
                </div>
              ) : (
                <div>You&apos;re already registered for the game</div>
              )}
            </div>
          </div>
        </div>
        <div
          className="col-span-12 lg:col-span-3 p-12"
          style={{ backgroundColor: "#160b21", borderLeft: "1px solid #0e0715" }}
        >
          {basicGetterFn && (
            <DisplayVariable
              abi={deployedContractData.abi as Abi}
              abiFunction={basicGetterFn.fn}
              contractAddress={deployedContractData.address}
              key={"getter"}
              refreshDisplayVariables={refreshDisplayVariables}
              inheritedFrom={basicGetterFn.inheritedFrom}
              poll={10000}
            >
              {({ result, RefreshButton }) => {
                return (
                  <div
                    className="p-6 text-white text-center border border- border-white w-full"
                    style={{ backgroundColor: "#42a232" }}
                  >
                    <div className="text-sm font-bold flex justify-center items-center">
                      <span>YOUR GETTER</span> <span>{RefreshButton}</span>
                    </div>
                    <div className="text-4xl mt-2">{displayTxResult(result)}</div>
                  </div>
                );
              }}
            </DisplayVariable>
          )}
        </div>
      </div>
    </div>
  );
};
