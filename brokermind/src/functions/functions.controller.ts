import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { FunctionsService } from './functions.service';

@Controller('api')
export class FunctionsController {
  constructor(private fns: FunctionsService) {}

  // Generic dispatcher matching the legacy SDK call style:
  //   client.functions.invoke(name, payload)  →  POST /api/functions/:name
  @Post('functions/:name')
  async invoke(@Param('name') name: string, @Body() body: any) {
    switch (name) {
      case 'ingestRecording':
        return this.fns.ingestRecording(body);
      case 'ingestEmail':
        return this.fns.ingestEmail(body);
      case 'ticketAutomation':
        return this.fns.ticketAutomation(body);
      case 'clientLookup':
        return this.fns.clientLookup(body);
      case 'getOrders':
        return this.fns.getOrders(body);
      case 'getMargin':
        return this.fns.getMargin(body);
      case 'getPortfolio':
        return this.fns.getPortfolio(body);
      case 'cancelOrder':
        return this.fns.cancelOrder(body);
      case 'squareOff':
        return this.fns.squareOff(body);
      case 'searchFaq':
        return this.fns.searchFaq(body);
      case 'saveConversation':
        return this.fns.saveConversation(body);
      case 'generateSOPSuggestions':
        return this.fns.generateSOPSuggestions(body);
      case 'syncBolnaCalls':
        return this.fns.syncBolnaCalls();
      case 'triggerBolnaCall':
        return this.fns.triggerBolnaCall(body);
      case 'backfillCallRecordings':
        return this.fns.backfillCallRecordings();
      case 'createEscalation':
        return this.fns.createEscalation(body);
      case 'fetchGmailEmails':
        return this.fns.fetchGmailEmails(body);
      case 'simulateCall':
        return this.fns.simulateCall(body);
      default:
        throw new BadRequestException(`Unknown function: ${name}`);
    }
  }

  // Dedicated webhook endpoint — secret comes in via headers, not body.
  @Post('webhooks/bolna')
  async bolnaWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader: string,
    @Headers('x-bolna-secret') secretHeader: string,
  ) {
    this.fns.validateBolnaSecret(authHeader, secretHeader);
    return this.fns.bolnaWebhook(body);
  }
}
