import * as React from "react";
import BtnGroup from "../BtnGroup";
import {CheckoutFormInstanceProps} from "./CheckoutForm";

export interface PaypalPlan {
	paypalId: string;
	description: string;
	amount: string;
	currency: string;
}

interface PaypalCheckoutFormProps extends CheckoutFormInstanceProps, React.ClassAttributes<PaypalCheckoutForm> {
	plans: PaypalPlan[];
	showCouponWarning?: boolean;
}

interface PaypalCheckoutFormState {
	selectedPlan: null | string;
	submit?: boolean;
}

export default class PaypalCheckoutForm extends React.Component<PaypalCheckoutFormProps, PaypalCheckoutFormState> {
	form: HTMLFormElement;

	constructor(props: PaypalCheckoutFormProps, context: any) {
		super(props, context);
		this.state = {
			submit: false,
			selectedPlan: this.props.plans ? this.props.plans[0].paypalId : null,
		};
	}

	getPlanButtons() {
		return this.props.plans.map((plan) => ({
			label: <h4>{plan.description}</h4>,
			value: plan.paypalId,
			className: "btn btn-default",
		}));
	}

	submit() {
		if (this.state.selectedPlan === null) {
			return;
		}
		this.props.onDisable(true);
		this.setState({submit: true}, () => this.form.submit());
	}

	renderCouponWarning() {
		if(!this.props.showCouponWarning) {
			return null;
		}

		return (
			<p className="alert alert-warning">
				We currently don't support coupons for PayPal payments.<br />
				<strong>You will be charged the full amount.</strong>
			</p>
		)
	}

	render() {
		const working = this.state.submit;
		return (
			<form
				method="post"
				style={{textAlign: "center"}}
				action={this.props.submitUrl}
				ref={(ref) => this.form = ref}
			>
				<div style={{margin: "25px 0"}}>
					<label htmlFor="paypal-plan" id="choose-plan">Choose your plan:</label>
					<BtnGroup
						className="btn-group btn-group-flex"
						buttons={this.getPlanButtons()}
						name="plan"
						id="paypal-plan"
						onChange={(selectedPlan) => this.setState({selectedPlan})}
						value={this.state.selectedPlan}
						aria-labelledby="choose-plan"
						disabled={working}
						required
					/>
				</div>
				{this.renderCouponWarning()}
				<p>
					<button
						className="promo-button text-premium checkout-button"
						onClick={() => this.submit()}
						disabled={working}
					>{!working ? "Pay with PayPal" : "Waiting for PayPal"}</button>
				</p>
				<div dangerouslySetInnerHTML={this.props.csrfElement}></div>
			</form>
		);
	}
}
