import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RegisterUserDto } from '@auth/dto';

@ValidatorConstraint({ name: 'IsPasswordMatches', async: false })
export class IsPasswordsMatchingConstraint
  implements ValidatorConstraintInterface
{
  validate(
    passwordReaped: string,
    args?: ValidationArguments,
  ): Promise<boolean> | boolean {
    const obj = args.object as RegisterUserDto;
    return obj.password === passwordReaped;
  }

  defaultMessage(): string {
    return 'Passwords does not matches';
  }
}
