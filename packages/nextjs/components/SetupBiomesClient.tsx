import { useReducer, useState } from "react";
import Image from "next/image";
import { Abi, AbiFunction } from "abitype";
import { useAccount } from "wagmi";
import { DisplayVariable } from "~~/app/debug/_components/contract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

const Modal = ({ isOpen, onClose }) => {
  const setIsBiomesClientSetup = useGlobalState(({ setIsBiomesClientSetup }) => setIsBiomesClientSetup);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-base-100 p-4 border">
        <div className="flex flex-col gap-4 items-center">
          <div className="text-2xl text-center">Confirm You Have Imported Avatars Into Biomes Before Playing</div>
          <img alt="" src="/importavatars/modal.png" style={{ width: "40%" }} className="rounded-sm mb-4" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="flex gap-2 items-center justify-center w-full cursor-pointer border border-white/10 p-2 font-mono uppercase text-lg transition bg-biomes hover:border-white"
            onClick={() => {
              setIsBiomesClientSetup(true);
            }}
            disabled={false}
          >
            Confirm And Play
          </button>

          <button
            className="flex gap-2 items-center justify-center w-full cursor-pointer border border-white/10 p-2 font-mono uppercase text-lg transition bg-white/20 hover:border-white"
            onClick={onClose}
            disabled={false}
          >
            Go Back And Finish Importing
          </button>
        </div>
      </div>
    </div>
  );
};

export const SetupBiomesClient: React.FC = ({}) => {
  const { address: connectedAddress } = useAccount();
  const [refreshDisplayVariables] = useReducer(value => !value, false);
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo("Game");
  const [isModalOpen, setModalOpen] = useState(false);

  const toggleModal = () => setModalOpen(!isModalOpen);

  if (connectedAddress === undefined) {
    return <div>Connect your wallet to continue</div>;
  }

  if (deployedContractData === undefined || deployedContractLoading) {
    return <div>Loading...</div>;
  }

  const viewFunctions = ((deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[])
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

  const buildGetter = viewFunctions.find(({ fn }) => fn.name === "getBuild");
  const matchAreaGetter = viewFunctions.find(({ fn }) => fn.name === "getMatchArea");
  const registeredPlayersGetter = viewFunctions.find(({ fn }) => fn.name === "getRegisteredPlayerEntityIds");

  return (
    <div className="flex-1 flex flex-col h-full p-mono">
      <div
        className="w-full bg-biomesNeg text-center"
        style={{ borderBottom: "1.5px solid red", paddingTop: "1rem", paddingBottom: "1rem" }}
      >
        DO NOT SKIP: To play this experience, you must import its data into the{" "}
        <a
          href="https://biome1.biomes.aw"
          target="_blank"
          style={{ textDecoration: "underline", fontWeight: "bolder", color: "white" }}
        >
          Biomes
        </a>{" "}
        client.
      </div>
      <div className="p-12 flex flex-col justify-between">
        {matchAreaGetter && (
          <div className="py-8 px-12">
            <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              Import Area You Have To Move Your Avatar Inside
            </h2>

            <div className="pt-2 flex flex-col gap-4 text-center" style={{ textAlign: "-webkit-center" }}>
              <div className="flex grid grid-cols-6">
                <div className="col-span-1 text-left">
                  <p>1) Copy Area:</p>
                </div>
                <div style={{ backgroundColor: "#160b21" }} className="col-span-5">
                  <DisplayVariable
                    abi={deployedContractData.abi as Abi}
                    abiFunction={matchAreaGetter.fn}
                    contractAddress={deployedContractData.address}
                    key={"getRegisteredPlayerEntityIds"}
                    refreshDisplayVariables={refreshDisplayVariables}
                    inheritedFrom={matchAreaGetter.inheritedFrom}
                    poll={2000}
                    bigCopy={true}
                  >
                    {({ CopyButton }) => {
                      return <div className="items-center text-center font-mono p-1">{CopyButton}</div>;
                    }}
                  </DisplayVariable>
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>2) Toggle To &quot;Show&quot; in Biomes Client:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importareas/one.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>3) Click Import in Areas Section:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importareas/two.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>4) Paste The Areas You Copied and Click Import:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importareas/three.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>You Should Now See Imported Areas:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importareas/four.png" className="w-3/4 border rounded-sm mb-4" />
                  <img alt="" src="/importareas/five.png" className="w-3/4 border rounded-sm mb-4" />
                  <img alt="" src="/importareas/six.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {registeredPlayersGetter && (
          <div className="py-8 px-12">
            <h2 className="text-xl pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              Import Avatars You Have To Kill
            </h2>

            <div className="pt-2 flex flex-col gap-4 text-center" style={{ textAlign: "-webkit-center" }}>
              <div className="flex grid grid-cols-6">
                <div className="col-span-1 text-left">
                  <p>1) Copy Avatar IDs:</p>
                </div>
                <div style={{ backgroundColor: "#160b21" }} className="col-span-5">
                  <DisplayVariable
                    abi={deployedContractData.abi as Abi}
                    abiFunction={registeredPlayersGetter.fn}
                    contractAddress={deployedContractData.address}
                    key={"getRegisteredPlayerEntityIds"}
                    refreshDisplayVariables={refreshDisplayVariables}
                    inheritedFrom={registeredPlayersGetter.inheritedFrom}
                    poll={2000}
                    bigCopy={true}
                  >
                    {({ CopyButton }) => {
                      return <div className="items-center text-center font-mono p-1">{CopyButton}</div>;
                    }}
                  </DisplayVariable>
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>2) Toggle To &quot;Show&quot; in Biomes Client:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importavatars/one.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>3) Click Import in Entities Section:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importavatars/two.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>4) Paste The Avatar IDs You Copied and Click Import:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importavatars/three.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>

              <div className="flex grid grid-cols-6">
                <div className="col-span-2 text-left">
                  <p>You Should Now See Imported Avatars:</p>
                </div>
                <div className="col-span-4">
                  <img alt="" src="/importavatars/four.png" className="w-3/4 border rounded-sm mb-4" />
                  <img alt="" src="/importavatars/five.png" className="w-3/4 border rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {buildGetter && (
          <div className="py-8 px-12">
            <h2 className="text-xl text-center pb-2" style={{ borderBottom: "0.5px solid white", textAlign: "center" }}>
              Import Blueprint of Builds You Have to Make
            </h2>
            <div className="pt-2 grid grid-cols-6 gap-4 text-center" style={{ textAlign: "-webkit-center" }}>
              <div className="col-span-1">
                <p>1) Copy build blueprint</p>
                <div style={{ backgroundColor: "#160b21", width: "fit-content", border: "1px solid white" }}>
                  <DisplayVariable
                    abi={deployedContractData.abi as Abi}
                    abiFunction={buildGetter.fn}
                    contractAddress={deployedContractData.address}
                    key={"getBuild"}
                    refreshDisplayVariables={refreshDisplayVariables}
                    inheritedFrom={buildGetter.inheritedFrom}
                    poll={2000}
                  >
                    {({ CopyButton }) => {
                      return <div className="items-center text-center font-mono p-1">{CopyButton}</div>;
                    }}
                  </DisplayVariable>
                </div>
              </div>

              <div className="col-span-2">
                <p>2) Click import builds in Biomes & paste</p>
                <Image alt="" src="/import_area_pre.png" width={300} height={500} className="border rounded-sm" />
              </div>

              <div className="col-span-3">
                <p>3) Place outlines of blueprints in world to get help for building</p>
                <div className="gap-4 flex flex-col items-center">
                  <Image alt="" src="/build_preview.png" width={225} height={250} className="border rounded-sm" />
                  <Image alt="" src="/build_manage.png" width={225} height={220} className="border rounded-sm" />
                  <Image alt="" src="/build_blueprint.png" width={225} height={220} className="border rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="py-8 px-12 mt-4">
          <button
            className="flex gap-2 items-center justify-center w-full cursor-pointer border border-white/10 p-2 font-mono uppercase text-lg transition bg-biomes hover:border-white"
            onClick={toggleModal}
            disabled={false}
          >
            I Have Imported The Avatars Into Biomes
          </button>
        </div>

        <Modal isOpen={isModalOpen} onClose={toggleModal} />
      </div>
    </div>
  );
};
