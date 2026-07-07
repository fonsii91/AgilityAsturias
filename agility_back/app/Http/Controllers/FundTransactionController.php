<?php

namespace App\Http\Controllers;

use App\Models\FundTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FundTransactionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Si es miembro o staff ordinario, solo puede consultar sus propios movimientos
        if ($user->role === 'member' || $user->role === 'staff') {
            $userId = $user->id;
        } else {
            // manager o admin
            // Puede consultar los movimientos de cualquier socio pasando el user_id
            $userId = $request->query('user_id', $user->id);

            // Evitar consulta de usuarios de otros clubes
            if ($userId !== $user->id) {
                $targetUser = User::find($userId);
                if (!$targetUser) {
                    return response()->json(['message' => 'El socio solicitado no pertenece a este club o no existe.'], 404);
                }
            }
        }

        $query = FundTransaction::where('user_id', $userId)->with(['creator']);

        $transactions = $query->orderBy('fecha', 'desc')->orderBy('created_at', 'desc')->get();

        // Calcular el saldo
        $ingresos = $transactions->where('type', 'ingreso')->sum('amount');
        $gastos = $transactions->where('type', 'gasto')->sum('amount');
        $balance = $ingresos - $gastos;

        return response()->json([
            'transactions' => $transactions,
            'balance' => (float)$balance,
            'user' => User::find($userId)
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'manager') {
            return response()->json(['message' => 'No tienes permisos para registrar transacciones.'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required_without:user_ids|integer|exists:users,id',
            'user_ids' => 'required_without:user_id|array',
            'user_ids.*' => 'integer|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'type' => 'required|string|in:ingreso,gasto',
            'concept' => 'required|string|max:255',
            'payment_method' => 'required|string|in:transferencia,bizum,efectivo,tarjeta,otro',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // max 5MB
            'fecha' => 'nullable|date_format:Y-m-d H:i:s'
        ]);

        $userIds = isset($validated['user_ids']) ? $validated['user_ids'] : [$validated['user_id']];

        // Validar que los socios pertenezcan al club activo (HasClub scope los filtra automáticamente)
        $usersCount = User::whereIn('id', $userIds)->count();
        if ($usersCount !== count($userIds)) {
            return response()->json(['message' => 'Uno o más socios seleccionados no pertenecen a este club o no existen.'], 422);
        }

        $transactions = [];
        \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $request, $user, $userIds, &$transactions) {
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('attachments', 'public');
            }

            foreach ($userIds as $uid) {
                $transactions[] = FundTransaction::create([
                    'user_id' => $uid,
                    'amount' => $validated['amount'],
                    'type' => $validated['type'],
                    'concept' => $validated['concept'],
                    'payment_method' => $validated['payment_method'],
                    'attachment_path' => $attachmentPath ? Storage::url($attachmentPath) : null,
                    'created_by' => $user->id,
                    'fecha' => $validated['fecha'] ?? now()->toDateTimeString(),
                ]);
            }
        });

        $msg = count($userIds) > 1 
            ? 'Transacciones registradas correctamente'
            : 'Transacción registrada correctamente';

        $responseData = [
            'message' => $msg,
            'transactions' => $transactions
        ];

        if (count($transactions) === 1) {
            $responseData['transaction'] = $transactions[0]->load('creator');
        }

        return response()->json($responseData);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'manager') {
            return response()->json(['message' => 'No tienes permisos para anular transacciones.'], 403);
        }

        $transaction = FundTransaction::findOrFail($id);
        
        // delete attachment file if exists
        if ($transaction->attachment_path) {
            $relativePath = str_replace('/storage/', '', $transaction->attachment_path);
            Storage::disk('public')->delete($relativePath);
        }

        $transaction->delete();

        return response()->json(['message' => 'Transacción anulada correctamente']);
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'manager') {
            return response()->json(['message' => 'No tienes permisos para ver el dashboard financiero.'], 403);
        }

        // Obtener todas las transacciones del club (HasClub lo filtra automáticamente)
        $allTransactions = FundTransaction::with(['creator:id,name'])->get();

        // Obtener los socios del club (HasClub lo filtra automáticamente)
        $users = User::select('id', 'name', 'email', 'class_bonus_balance')->orderBy('name')->get();

        $userBalances = [];
        foreach ($users as $u) {
            $userBalances[$u->id] = [
                'user' => $u,
                'balance' => 0.0
            ];
        }

        foreach ($allTransactions as $tx) {
            if (!isset($userBalances[$tx->user_id])) {
                continue;
            }
            if ($tx->type === 'ingreso') {
                $userBalances[$tx->user_id]['balance'] += (float)$tx->amount;
            } else {
                $userBalances[$tx->user_id]['balance'] -= (float)$tx->amount;
            }
        }

        $totalCaja = 0.0;
        $totalFondos = 0.0;
        $totalDeuda = 0.0;
        $deudoresCount = 0;

        foreach ($userBalances as $ub) {
            $bal = $ub['balance'];
            $totalCaja += $bal;
            if ($bal > 0) {
                $totalFondos += $bal;
            } elseif ($bal < 0) {
                $totalDeuda += abs($bal);
                $deudoresCount++;
            }
        }

        // Obtener últimas 5 transacciones en el club
        $recentTransactions = FundTransaction::with(['user:id,name,email', 'creator:id,name'])
            ->orderBy('fecha', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $usersWithBalances = [];
        foreach ($userBalances as $userId => $data) {
            $usersWithBalances[] = [
                'id' => $data['user']->id,
                'name' => $data['user']->name,
                'email' => $data['user']->email,
                'balance' => (float)number_format($data['balance'], 2, '.', ''),
                'class_bonus' => (int) $data['user']->class_bonus_balance,
            ];
        }

        // Ordenar por nombre
        usort($usersWithBalances, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });

        return response()->json([
            'total_caja' => (float)number_format($totalCaja, 2, '.', ''),
            'total_fondos' => (float)number_format($totalFondos, 2, '.', ''),
            'total_deuda' => (float)number_format($totalDeuda, 2, '.', ''),
            'deudores_count' => $deudoresCount,
            'recent_transactions' => $recentTransactions,
            'users_with_balances' => $usersWithBalances
        ]);
    }
}
