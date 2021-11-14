/* eslint-disable security/detect-object-injection */
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JWTEnvironmentVariables } from '@ticketing/microservices/shared/env';
import { SESSION_ACCESS_TOKEN } from '@ticketing/shared/constants';
import { Ticket } from '@ticketing/shared/models';
import { Types } from 'mongoose';
import * as sodium from 'sodium-native';

import { TicketModel } from '../src/app/tickets/schemas/ticket.schema';

function genNonce(): Buffer {
  const buf = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES);
  sodium.randombytes_buf(buf);
  return buf;
}

export function createSigninSession(
  app: NestFastifyApplication,
  user: {
    email: string;
    id?: string;
  }
): string {
  const jwtService = app.get<JwtService>(JwtService);
  const configService =
    app.get<ConfigService<JWTEnvironmentVariables>>(ConfigService);
  const payload = {
    username: user.email,
    sub: user.id || new Types.ObjectId().toHexString(),
  };
  const token = jwtService.sign(payload);
  const sessionKey = configService.get('SESSION_KEY');
  // mock fastify-secure-session
  const kObj = Symbol('object');
  const session = { [kObj]: {} };
  session[kObj][SESSION_ACCESS_TOKEN] = token;
  const nonce = genNonce();
  const msg = Buffer.from(JSON.stringify(session[kObj]));
  const cipher = Buffer.allocUnsafe(
    msg.length + sodium.crypto_secretbox_MACBYTES
  );
  sodium.crypto_secretbox_easy(cipher, msg, nonce, sessionKey);
  return cipher.toString('base64') + ';' + nonce.toString('base64');
}

export async function createTicket(
  options: {
    title?: string;
    price?: number;
    userId?: string;
  },
  ticketModel: TicketModel
): Promise<Ticket> {
  const ticketToCreate = {
    title: options?.title || 'title',
    price: options?.price || 20,
    userId: options?.userId || new Types.ObjectId().toHexString(),
  };
  const ticket = await ticketModel.create(ticketToCreate);
  return ticket.toJSON<Ticket>();
}
