import React, { Component } from "react";
import {
    Button,
    Table,
    Checkbox,
    Loader,
    Segment,
    Dimmer,
    Image,
    Message,
    Icon
} from "semantic-ui-react";
import ProcessingModal from "../ProcessingModal";
import crypto from "crypto";

class OptionsTableActiveElection extends Component {
    state = {
        selected: [],
        voteLimit: 1,
        modalOpen: false,
        modalState: "",
        errorMessage: "",
	receipt: ""
    };

    toggle = e => {
        const selected = [...this.state.selected];
        if (e.target.checked) {
            selected.push(e.target.id);
        } else {
            const index = selected.findIndex(v => v === e.target.id);
            selected.splice(index, 1);
        }
        this.setState({ selected });
    };

    vote = async event => {
        this.setState({ modalOpen: true, modalState: "processing" });

        try {
            this.props.contract.methods
                .vote(this.encryptVotes())
                .send({ from: this.props.userAddresses[0] })
		.then(receipt => {
			this.setState({ receipt: JSON.stringify(receipt),
					modalState: "success"
			});
		});
        } catch (err) {
            this.setState({ modalState: "error", errorMessage: err.message });
        }
    };

    encryptVotes() {
        const publicKey = this.props.publicKey;

        let vote = Array(this.props.options.length + 1); // + 1 for nonce
        for (let i = 0; i < vote.length; i++) {
            vote[i] = 0;
        }

        this.state.selected.forEach(option => {
            vote[option] = 1;
        });

        vote[this.props.options.length] = crypto.randomBytes(25).toString('hex');

        return crypto.publicEncrypt(publicKey, Buffer.from(JSON.stringify(vote))).toString('hex');
    }

    handleModalClose = () => {
        this.setState({ modalOpen: false });
    };

    render() {
        return (
            <React.Fragment>
                <ProcessingModal
                    modalOpen={this.state.modalOpen}
                    modalState={this.state.modalState}
                    handleModalClose={this.handleModalClose}
                    errorMessageDetailed={this.state.errorMessage}
                    processingMessage="This usually takes around 15 seconds. Please stay with us."
                    errorMessage="We encountered an error. Please try again."
                    successMessage={"Your vote has been counted. Thank you.\nReceipt: "+this.state.receipt}
                />

                <Table celled compact unstackable>
                    <Table.Header fullWidth>
                        <Table.Row>
                            <Table.HeaderCell>Name</Table.HeaderCell>
                            <Table.HeaderCell>Party</Table.HeaderCell>
                            {this.props.userIsRegisteredVoter ? (
                                <Table.HeaderCell textAlign="center">
                                    Vote
                                </Table.HeaderCell>
                            ) : null}
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {this.props.options !== undefined ? (
                            this.props.options.map((option, i) => (
                                <Table.Row key={i}>
                                    <Table.Cell>{option.name}</Table.Cell>
                                    <Table.Cell>
                                        {option.party}
                                    </Table.Cell>
                                        <Table.Cell
                                            collapsing
                                            textAlign="center"
                                        >
                                            <Checkbox
                                                toggle
                                                id={i}
                                                onChange={this.toggle}
                                            />
                                        </Table.Cell>
                                </Table.Row>
                            ))
                        ) : (
                            <Table.Row>
                                <Table.Cell colSpan="3" textAlign="center">
                                    <Segment>
                                        <Dimmer active inverted>
                                            <Loader inverted>Loading</Loader>
                                        </Dimmer>
                                        <Image src="https://react.semantic-ui.com/images/wireframe/short-paragraph.png" />
                                    </Segment>
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>


                        <Table.Footer fullWidth>
                            <Table.Row>
                                <Table.HeaderCell colSpan="2">
                                    {this.state.selected.length === 0 ? (
                                        <Message warning>
                                            Please select at least one option.
                                        </Message>
                                    ) : this.state.selected.length >
                                      this.state.voteLimit ? (
                                        <Message negative>
                                            You only have {this.state.voteLimit}{" "}
                                            {this.state.voteLimit > 1
                                                ? "votes"
                                                : "vote"}
                                            , but selected{" "}
                                            {this.state.selected.length}{" "}
                                            options.
                                        </Message>
                                    ) : null}
                                </Table.HeaderCell>
                                <Table.HeaderCell>
                                    <Button
                                        animated="fade"
                                        loading={
                                            this.state.modalState ===
                                            "processing"
                                        }
                                        onClick={this.vote}
                                        color="green"
                                        fluid
                                        disabled={
                                            !(
                                                this.state.selected.length >
                                                    0 &&
                                                this.state.selected.length <=
                                                    this.state.voteLimit
                                            )
                                        }
                                    >
                                        <Button.Content visible>
                                            Vote
                                        </Button.Content>
                                        <Button.Content hidden>
                                            <Icon name="envelope" />
                                        </Button.Content>
                                    </Button>
                                </Table.HeaderCell>
                            </Table.Row>
                        </Table.Footer>
                </Table>
            </React.Fragment>
        );
    }
}

export default OptionsTableActiveElection;
