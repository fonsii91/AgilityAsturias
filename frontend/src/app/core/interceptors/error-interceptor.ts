import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado.';
      let showErrorToast = true;

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 0) {
          errorMessage = 'No hay conexión con el servidor. Verifica tu internet.';
        } else if (error.status === 401) {
          errorMessage = 'No tienes permiso para realizar esta acción.';
          if (req.method === 'GET') showErrorToast = false;
        } else if (error.status === 403) {
          errorMessage = 'Acceso denegado.';
          if (req.method === 'GET') showErrorToast = false;
        } else if (error.status === 404) {
          errorMessage = 'El recurso solicitado no existe.';
        } else if (error.status === 413) {
          errorMessage = 'El archivo que intentas subir es demasiado pesado. Revisa el límite permitido.';
        } else if (error.status === 422) {
          // Intentar extraer el mensaje de error específico si es de un archivo
          if (error.error?.errors) {
             const firstError = Object.values(error.error.errors)[0] as string[];
             errorMessage = firstError[0] || 'Por favor, revisa los datos introducidos.';
          } else {
             errorMessage = 'Los datos enviados no son válidos.';
          }
        } else if (error.status >= 500) {
          errorMessage = 'Error en el servidor. Inténtalo más tarde.';
        }
      }

      if (showErrorToast) {
        toastService.error(errorMessage);
      }
      return throwError(() => error);
    })
  );
};
