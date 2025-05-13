// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Faucet {
    error NotOwner();
    error FaucetEmpty();
    error FailedToSend();


    address public owner;

    uint public constant DRIP_AMOUNT = 0.001 ether;


    constructor(){
        owner = msg.sender;
    }
    function deposit() external payable {


    }

    function changeOwner(address _newOwner) public{
        if(msg.sender != owner){
            revert NotOwner();
        }

        owner = _newOwner;
    }

    function drip(address payable _to) public  {
        if(msg.sender != owner){
            revert NotOwner();
        }
        
        if (address(this).balance < DRIP_AMOUNT) {
            revert FaucetEmpty();
        }


        (bool sent,) = _to.call{value: DRIP_AMOUNT}("");

        if (!sent){
            revert FailedToSend();
        }

    }
}
