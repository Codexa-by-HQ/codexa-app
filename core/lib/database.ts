import {
	createMongoDatabase,
	type MongoDatabaseConnection,
} from '@codexa/core/config';
import type { SetupEnvironment } from '../validations/environment.validation.ts';

/** OAuth Base needs transactions, so the connection insists on a replica set. */
export function loadMongodb(
	config: Pick<SetupEnvironment, 'DATABASE_URL' | 'DATABASE_NAME'>,
): MongoDatabaseConnection {
	return createMongoDatabase(config.DATABASE_URL, {
		databaseName: config.DATABASE_NAME,
		requireTransactions: true,
	});
}

/** OAuth Base database requirements. Call only after connect() resolves. */
export function getDatabaseRequirements(connection: MongoDatabaseConnection) {
	return {
		database: connection.getDb(),
		mongoClient: connection.getClient(),
		supportsTransactions: connection.supportsTransactions(),
	};
}
