import { Observable, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { HttpException, HttpStatus } from '@nestjs/common';

export function handleObservableTimeoutAndError<T = unknown>() {
  return (source$: Observable<T>) =>
    source$.pipe(
      timeout(5000),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          throw new HttpException(error.message, HttpStatus.REQUEST_TIMEOUT);
        }
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }),
    );
}
