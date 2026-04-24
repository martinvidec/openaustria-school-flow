import { PartialType } from '@nestjs/swagger';
import { CreateGroupDerivationRuleDto } from './create-group-derivation-rule.dto';

export class UpdateGroupDerivationRuleDto extends PartialType(CreateGroupDerivationRuleDto) {}
