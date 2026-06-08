/**
 * Hook de premios
 * Estado y mutaciones de awards y nominaciones por grupo.
 */

import { useCallback, useEffect, useState } from 'react';
import { awardsService } from '../services/awards.service';
import {
  Award,
  AwardStatus,
  AwardWithNominees,
  CreateAwardInput,
  UpdateAwardInput,
} from '../types/database';

export function useGroupAwards(groupId: string | undefined) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAwards = useCallback(async () => {
    if (!groupId) {
      setAwards([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await awardsService.getGroupAwards(groupId);
      setAwards(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  const createAward = async (input: Omit<CreateAwardInput, 'group_id'>) => {
    if (!groupId) throw new Error('No group ID');
    const award = await awardsService.createAward({ ...input, group_id: groupId });
    await fetchAwards();
    return award;
  };

  return {
    awards,
    isLoading,
    error,
    refetch: fetchAwards,
    createAward,
  };
}

export function useAward(awardId: string | undefined) {
  const [award, setAward] = useState<AwardWithNominees | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);

  const fetchAward = useCallback(async () => {
    if (!awardId) {
      setAward(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [data, vote] = await Promise.all([
        awardsService.getAwardById(awardId),
        awardsService.getMyVote(awardId),
      ]);
      setAward(data);
      setMyVote(vote);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [awardId]);

  useEffect(() => {
    fetchAward();
  }, [fetchAward]);

  const updateAward = async (input: UpdateAwardInput) => {
    if (!awardId) throw new Error('No award ID');
    const updated = await awardsService.updateAward(awardId, input);
    setAward(prev => prev ? { ...prev, ...updated } : null);
    return updated;
  };

  const deleteAward = async () => {
    if (!awardId) throw new Error('No award ID');
    await awardsService.deleteAward(awardId);
    setAward(null);
  };

  const updateStatus = async (status: AwardStatus) => {
    if (!awardId) throw new Error('No award ID');
    const updated = await awardsService.updateAwardStatus(awardId, status);
    setAward(prev => prev ? { ...prev, ...updated } : null);
    return updated;
  };

  const addNominee = async (userId: string, reason?: string) => {
    if (!awardId) throw new Error('No award ID');
    await awardsService.addNominee(awardId, userId, reason);
    await fetchAward();
  };

  const removeNominee = async (nomineeId: string) => {
    await awardsService.removeNominee(nomineeId);
    await fetchAward();
  };

  const vote = async (nomineeId: string) => {
    if (!awardId) throw new Error('No award ID');
    await awardsService.vote(awardId, nomineeId);
    setMyVote(nomineeId);
    await fetchAward();
  };

  const declareWinner = async () => {
    if (!awardId) throw new Error('No award ID');
    const updated = await awardsService.declareWinner(awardId);
    await fetchAward();
    return updated;
  };

  return {
    award,
    isLoading,
    error,
    myVote,
    hasVoted: !!myVote,
    refetch: fetchAward,
    updateAward,
    deleteAward,
    updateStatus,
    addNominee,
    removeNominee,
    vote,
    declareWinner,
    canVote: award?.status === 'voting' && !myVote,
  };
}
