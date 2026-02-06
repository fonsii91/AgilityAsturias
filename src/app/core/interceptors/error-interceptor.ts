import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado.';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 0) {
          errorMessage = 'No hay conexión con el servidor. Verifica tu internet.';
        } else if (error.status === 401) {
          errorMessage = 'No tienes permiso para realizar esta acción.';
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado.';
        } else if (error.status === 404) {
          errorMessage = 'El recurso solicitado no existe.';
        } else if (error.status >= 500) {
          errorMessage = 'Error en el servidor. Inténtalo más tarde.';
        }
      }

      toastService.error(errorMessage);
      return throwError(() => error);
    })
  );
};
