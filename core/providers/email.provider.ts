import nodemailer from 'nodemailer';
import {
	type EmailDeliveryProvider,
	type EmailMessage,
	EmailMessageSchema,
} from '@codexa/oauth/validations';
import {
	type HostEmailConfigInput,
	HostEmailConfigSchema,
} from '../validations/email.validation.ts';

/** Host owned SMTP adapter for OAuth Base recovery and verification emails. */
export class HostEmailProvider implements EmailDeliveryProvider {
	readonly #from: string;
	readonly #transporter: ReturnType<typeof nodemailer.createTransport>;
	#closed = false;

	constructor(input: HostEmailConfigInput) {
		const config = HostEmailConfigSchema.parse(input);
		this.#from = config.from;
		this.#transporter = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			requireTLS: config.requireTls,
			tls: { minVersion: 'TLSv1.2' },
			auth: config.username
				? { user: config.username, pass: config.password }
				: undefined,
			connectionTimeout: config.connectionTimeoutMs,
			greetingTimeout: config.greetingTimeoutMs,
			socketTimeout: config.socketTimeoutMs,
		});
	}

	/** Resolve only after SMTP accepts the recipient and the whole message. */
	async send(input: Readonly<EmailMessage>) {
		if (this.#closed) throw new Error('The host email provider is closed.');
		const message = EmailMessageSchema.parse(input);
		const result = await this.#transporter.sendMail({
			from: this.#from,
			...message,
		});
		if (!result.accepted.length) {
			throw new Error('SMTP server rejected the email recipient.');
		}
		return Object.freeze({ messageId: result.messageId });
	}

	/** Close only the transport this adapter created. */
	close(): void {
		if (this.#closed) return;
		this.#closed = true;
		this.#transporter.close();
	}
}
