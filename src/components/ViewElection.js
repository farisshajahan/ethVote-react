import React, { Component } from "react";
import { Redirect } from "react-router-dom";
import { Segment, Message, Icon, Image } from "semantic-ui-react";
import OptionsTableActiveElection from "./electionPageComponents/OptionsTableActiveElection";
import GeneralInformationHeader from "./electionPageComponents/GeneralInformationHeader";
import Web3 from "web3";
import RegistrationAuthority from "../ethereum/RegistrationAuthority.json";
import Election from "../ethereum/Election.json";
import addresses from "../ethereum/addresses";
import getContractStatus from "../utils/getContractStatus";
import OptionsTableUpcomingElection from "./electionPageComponents/OptionsTableUpcomingElection";
import OptionsTablePastElection from "./electionPageComponents/OptionsTablePastElection";

class ViewElection extends Component {
    state = {
        redirect: false,
        wrongNetwork: false,
        electionNotFound: false,
        showLoader: true,
        userIsRegisteredVoter: false,
        type: "current",
        contract: undefined,
        contractDetails: {},
        hasVotedMessageVisible: true
    };

    async componentDidMount() {
        await this.loadAllRelevantData();
    }

    async loadAllRelevantData() {
        let web3, regAuthority, /*electionFactory,*/ contract;
        try {
            // Get Web3 and contracts
            await window.web3.currentProvider.enable();
            web3 = new Web3(window.web3.currentProvider);
            regAuthority = this.getRegistrationAuthority(web3);
            
            window.web3.currentProvider.on(
                "accountsChanged",
                this.metamaskChanged
            );

            window.web3.currentProvider.autoRefreshOnNetworkChange = false;
            window.web3.currentProvider.on(
                "networkChanged",
                this.metamaskChanged
            );

            contract = this.getElectionContract(
                web3,
                this.props.match.params.address
            );

            const userAddresses = await web3.eth.getAccounts();
            const contractDetails = {
                address: await contract._address,
                title: await contract.methods.title().call(),
                description: await contract.methods.description().call(),
                startTime: await contract.methods.startTime().call(),
                timeLimit: await contract.methods.endTime().call(),
                userHasVoted: await contract.methods
                    .hasVoted(userAddresses[0])
                    .call(),
                options: await contract.methods.getBallot().call(),
                publicKey: await contract.methods.encryptionKey().call()
            };

            // Check if user is a regsitered voter
            const regAuthorityManager = await regAuthority.methods
                .registrationAuthority()
                .call();
             const userIsRegAuthority = regAuthorityManager === userAddresses[0];

            this.setState({
                showLoader: false,
                contract,
                electionid: this.props.match.params.address,
                contractDetails,
                userAddresses,
                regAuthority,
            });
        } catch (err) {
            if (window.web3 === undefined) {
                // Metamask not installed
                this.setState(function(prevState, props) {
                    return { redirect: true };
                });
            } else if (contract === undefined) {
                this.setState(function(prevState, props) {
                    return { electionNotFound: true };
                });
            } else {
                // Wrong Ethereum network
                this.setState(function(prevState, props) {
                    return { wrongNetwork: true };
                });
            }
        }
    }

    getRegistrationAuthority(web3) {
        const address = addresses.registrationAuthority;
        const abi = RegistrationAuthority.abi;
        const contract = new web3.eth.Contract(abi, address);
        return contract;
    }

    getElectionContract(web3, address) {
        const abi = Election.abi;
        const contract = new web3.eth.Contract(abi, address);
        return contract;
    }

    metamaskChanged = () => {
        window.location.reload();
    };

    handleDismissHasVotedMessage = () => {
        this.setState({ hasVotedMessageVisible: false });
    };

    render() {
        const contractStatus = getContractStatus(
            this.state.contractDetails.startTime,
            this.state.contractDetails.timeLimit
        );
        return this.state.showLoader ? (
            <Segment loading>
                <Image src="https://react.semantic-ui.com/images/wireframe/paragraph.png" />
            </Segment>
        ) : (
            <React.Fragment>
                {this.state.redirect ? <Redirect to="/metamask" /> : null}

                {this.state.wrongNetwork ? (
                    <Redirect to="/wrongnetwork" />
                ) : null}

                {this.state.electionNotFound ? <Redirect to="/error" /> : null}

                <GeneralInformationHeader
                    title={this.state.contractDetails.title}
                    description={this.state.contractDetails.description}
                    startTime={this.state.contractDetails.startTime}
                    timeLimit={this.state.contractDetails.timeLimit}
                />

                {this.state.contractDetails.userHasVoted &&
                this.state.hasVotedMessageVisible &&
                contractStatus !== "past" ? (
                    <Message
                        icon
                        info
                        size="small"
                        onDismiss={this.handleDismissHasVotedMessage}
                    >
                        <Icon name="info" />
                        <Message.Content>
                            <Message.Header>
                                You have already voted
                            </Message.Header>
                                You are permitted to vote only once
                        </Message.Content>
                    </Message>
                ) : null}

                {contractStatus !== "error" ? (
                    contractStatus === "past" ? (
                        <React.Fragment>
                            <OptionsTablePastElection
                                options={this.state.contractDetails.options}
                                contract={this.state.contract}
                                userAddresses={this.state.userAddresses}
                                regAuthority={this.state.regAuthority}
                                electionid={this.state.electionid}                            
                            />
                        </React.Fragment>
                    ) : contractStatus === "current" ? (
                        <React.Fragment>
                            <OptionsTableActiveElection
                                options={this.state.contractDetails.options}
                                publicKey={this.state.contractDetails.publicKey}
                                contract={this.state.contract}
                                userIsRegisteredVoter={
                                    this.state.userIsRegisteredVoter
                                }
                                userAddresses={this.state.userAddresses}
                                regAuthority={this.state.regAuthority}
                                electionid={this.state.electionid}   
                            />
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            {!this.state.contractDetails.userHasVoted ? (
                            <OptionsTableUpcomingElection
                                options={this.state.contractDetails.options}
                                contract={this.state.contract}
                                userAddresses={this.state.userAddresses}
                                electionid={this.state.electionid}
                                regAuthority={this.state.regAuthority}
                            />
                            ) : null}
                        </React.Fragment>
                    )
                ) : null}
            </React.Fragment>
        );
    }
}

export default ViewElection;
