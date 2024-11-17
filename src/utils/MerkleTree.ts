import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { solidityPackedKeccak256 } from "ethers";

const createMerkleTree = (claims: { address: string; amount: string }[]) => {
  const data: { leaf: string; address: string; amount: string }[] = [];

  const leaves = claims.map((claim) => {
    const leaf = solidityPackedKeccak256(
      ["address", "uint256"],
      [claim.address, claim.amount]
    );
    data.push({ leaf, address: claim.address, amount: claim.amount });
    return leaf;
  });

  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = merkleTree.getHexRoot();
  return { merkleTree, leaves, root, data };
};

export { createMerkleTree };
