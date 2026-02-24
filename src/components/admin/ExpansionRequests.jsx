import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, TrendingUp, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpansionRequests() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['expansionRequests'],
    queryFn: () => base44.entities.ExpansionInterest.list('-created_date', 100),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => 
      base44.entities.ExpansionInterest.update(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expansionRequests'] });
      toast.success('Request updated');
    },
  });

  // Group by city for geographic clustering
  const requestsByCity = requests.reduce((acc, req) => {
    const city = req.requested_city || 'Unknown';
    if (!acc[city]) acc[city] = [];
    acc[city].push(req);
    return acc;
  }, {});

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const evaluatingCount = requests.filter(r => r.status === 'evaluating').length;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    evaluating: 'bg-blue-100 text-blue-800 border-blue-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    declined: 'bg-red-100 text-red-800 border-red-300',
    activated: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
                <p className="text-yellow-700 text-sm font-medium uppercase mt-1">Pending</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-900">{evaluatingCount}</p>
                <p className="text-blue-700 text-sm font-medium uppercase mt-1">Evaluating</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-purple-900">{Object.keys(requestsByCity).length}</p>
                <p className="text-purple-700 text-sm font-medium uppercase mt-1">Cities</p>
              </div>
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-900">{requests.length}</p>
                <p className="text-green-700 text-sm font-medium uppercase mt-1">Total Requests</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Clustering */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            Geographic Clustering Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(requestsByCity)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([city, cityRequests]) => (
                <div key={city} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{city}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {cityRequests.map(r => r.requested_gym_name).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-600 text-white font-mono">
                      {cityRequests.length} {cityRequests.length === 1 ? 'request' : 'requests'}
                    </Badge>
                    <Badge className="bg-blue-600 text-white font-mono">
                      Density: {Math.min(100, cityRequests.length * 25)}%
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* All Requests */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            All Expansion Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No expansion requests yet</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{request.requested_gym_name}</p>
                        <Badge className={`${statusColors[request.status]} text-xs border`}>
                          {request.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{request.requested_gym_address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Requested by: {request.user_email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(request.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({
                              id: request.id,
                              status: 'evaluating',
                              notes: 'Under evaluation'
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Evaluate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({
                              id: request.id,
                              status: 'declined',
                              notes: 'Declined by admin'
                            })}
                            disabled={updateStatusMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {request.status === 'evaluating' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({
                              id: request.id,
                              status: 'approved',
                              notes: 'Approved for expansion'
                            })}
                            disabled={updateStatusMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({
                              id: request.id,
                              status: 'declined',
                              notes: 'Declined after evaluation'
                            })}
                            disabled={updateStatusMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({
                            id: request.id,
                            status: 'activated',
                            notes: 'Facility activated'
                          })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          Mark Activated
                        </Button>
                      )}
                    </div>
                  </div>
                  {request.notes && (
                    <div className="bg-white rounded p-2 border border-gray-200 mt-2">
                      <p className="text-xs text-gray-600">
                        <span className="font-semibold">Notes:</span> {request.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}