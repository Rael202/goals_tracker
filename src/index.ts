import {
    $query,
    $update,
    Record,
    StableBTreeMap,
    Vec,
    match,
    Result,
    nat64,
    ic,
    Opt,
    Principal,
    float64,
} from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Goal = Record<{
    owner: Principal;
    id: string;
    title: string;
    description: string;
    startDate: string;
    targetDate: string;
    progress: float64; // Changed to float64 for progress
    milestones: Vec<Milestone>;
    created_at: nat64;
    updated_at: Opt<nat64>;
}>;

type Milestone = Record<{
    id: string;
    goalId: string;
    title: string;
    description: string;
    targetDate: string;
    isCompleted: boolean;
    created_at: nat64;
    updated_at: Opt<nat64>;
}>;

type GoalPayload = Record<{
    title: string;
    description: string;
    startDate: string;
    targetDate: string;
}>;

type MilestonePayload = Record<{
    title: string;
    description: string;
    targetDate: string;
}>;

const goalStorage = new StableBTreeMap<string, Goal>(0, 44, 512);
const milestoneStorage = new StableBTreeMap<string, Milestone>(1, 44, 512);

$update
export function addGoal(payload: GoalPayload): Result<Goal, string> {
    if (!payload.title || !payload.description || !payload.startDate || !payload.targetDate) {
        return Result.Err<Goal, string>('Missing or invalid input data');
    }

    try {
        const newGoal: Goal = {
            owner: ic.caller(),
            id: uuidv4(),
            title: payload.title,
            description: payload.description,
            startDate: payload.startDate,
            targetDate: payload.targetDate,
            progress: 0.0, // Initialize progress as float64
            milestones: [],
            created_at: ic.time(),
            updated_at: Opt.None,
        };
        goalStorage.insert(newGoal.id, newGoal);
        return Result.Ok<Goal, string>(newGoal);
    } catch (err) {
        return Result.Err<Goal, string>('Issue found when creating the goal');
    }
}

$update
export function updateGoal(id: string, payload: GoalPayload): Result<Goal, string> {
    return match(goalStorage.get(id), {
        Some: (goal) => {
            if (!arePrincipalsEqual(goal.owner, ic.caller())) {
                return Result.Err<Goal, string>('You are not authorized to access Goal');
            }
            const updatedGoal: Goal = { ...goal, ...payload, updated_at: Opt.Some(ic.time()) };
            goalStorage.insert(goal.id, updatedGoal);
            return Result.Ok<Goal, string>(updatedGoal);
        },
        None: () => Result.Err<Goal, string>(`Goal with id:${id} not found`),
    });
}

$update
export function deleteGoal(id: string): Result<Goal, string> {
    return match(goalStorage.get(id), {
        Some: (goal) => {
            if (!arePrincipalsEqual(goal.owner, ic.caller())) {
                return Result.Err<Goal, string>('You are not authorized to access Goal');
            }
            goalStorage.remove(id);
            return Result.Ok<Goal, string>(goal);
        },
        None: () => Result.Err<Goal, string>(`Goal with id:${id} not found`),
    });
}

$query
export function getGoal(id: string): Result<Goal, string> {
    return match(goalStorage.get(id), {
        Some: (goal) => {
            if (!arePrincipalsEqual(goal.owner, ic.caller())) {
                return Result.Err<Goal, string>('You are not authorized to access Goal');
            }
            return Result.Ok<Goal, string>(goal);
        },
        None: () => Result.Err<Goal, string>(`Goal with id:${id} not found`),
    });
}

$query
export function getGoals(): Vec<Goal> {
    const goals = goalStorage.values();
    return goals;
}

$query
export function searchGoal(searchInput: string): Result<Vec<Goal>, string> {
    const lowerCaseSearchInput = searchInput.toLowerCase();
    try {
        const searchedGoal = goalStorage.values().filter(
            (goal) =>
                goal.title.toLowerCase().includes(lowerCaseSearchInput) ||
                goal.description.toLowerCase().includes(lowerCaseSearchInput)
        );
        return Result.Ok(searchedGoal);
    } catch (err) {
        return Result.Err('Error finding the Goal being searched');
    }
}

$update
export function addMilestone(goalId: string, payload: MilestonePayload): Result<Milestone, string> {
    if (!payload.title || !payload.description || !payload.targetDate) {
        return Result.Err<Milestone, string>('Missing or invalid input data');
    }

    try {
        const newMilestone: Milestone = {
            id: uuidv4(),
            goalId,
            title: payload.title,
            description: payload.description,
            targetDate: payload.targetDate,
            isCompleted: false,
            created_at: ic.time(),
            updated_at: Opt.None,
        };
        milestoneStorage.insert(newMilestone.id, newMilestone);
        return Result.Ok<Milestone, string>(newMilestone);
    } catch (err) {
        return Result.Err<Milestone, string>('Issue found when creating the milestone');
    }
}

$update
export function updateMilestone(id: string, payload: MilestonePayload): Result<Milestone, string> {
    return match(milestoneStorage.get(id), {
        Some: (milestone) => {
            const updatedMilestone: Milestone = { ...milestone, ...payload, updated_at: Opt.Some(ic.time()) };
            milestoneStorage.insert(milestone.id, updatedMilestone);
            return Result.Ok<Milestone, string>(updatedMilestone);
        },
                  None: () => Result.Err<Milestone, string>(`Milestone with id:${id} not found`),
    });
}

$update
export function deleteMilestone(id: string): Result<Milestone, string> {
    return match(milestoneStorage.get(id), {
        Some: (milestone) => {
            if (milestone.goalId.toString() !== ic.caller().toString()) {
                return Result.Err<Milestone, string>('You are not authorized to access Milestone');
            }
            milestoneStorage.remove(id);
            return Result.Ok<Milestone, string>(milestone);
        },
        None: () => Result.Err<Milestone, string>(`Milestone with id:${id} not found`),
    });
}

$query
export function getMilestone(id: string): Result<Milestone, string> {
    return match(milestoneStorage.get(id), {
        Some: (milestone) => {
            if (milestone.goalId.toString() !== ic.caller().toString()) {
                return Result.Err<Milestone, string>('You are not authorized to access Milestone');
            }
            return Result.Ok<Milestone, string>(milestone);
        },
        None: () => Result.Err<Milestone, string>(`Milestone with id:${id} not found`),
    });
}

$query
export function getMilestones(): Vec<Milestone> {
    const milestones = milestoneStorage.values();
    return milestones;
}

$query
export function searchMilestone(searchInput: string): Result<Vec<Milestone>, string> {
    const lowerCaseSearchInput = searchInput.toLowerCase();
    try {
        const searchedMilestone = milestoneStorage.values().filter(
            (milestone) =>
                milestone.title.toLowerCase().includes(lowerCaseSearchInput) ||
                milestone.description.toLowerCase().includes(lowerCaseSearchInput)
        );
        return Result.Ok(searchedMilestone);
    } catch (err) {
        return Result.Err('Error finding the Milestone being searched');
    }
}

$query
export function getMilestonesByGoal(goalId: string): Result<Vec<Milestone>, string> {
    const milestones = milestoneStorage.values().filter((milestone) => milestone.goalId === goalId);
    return Result.Ok(milestones);
}

$update
export function markMilestoneAsCompleted(id: string): Result<Milestone, string> {
    return match(milestoneStorage.get(id), {
        Some: (milestone) => {
            const updatedMilestone: Milestone = {
                ...milestone,
                isCompleted: true,
                updated_at: Opt.Some(ic.time()),
            };
            milestoneStorage.insert(milestone.id, updatedMilestone);
            return Result.Ok<Milestone, string>(updatedMilestone);
        },
        None: () => Result.Err<Milestone, string>(`Milestone with id:${id} not found`),
    });
}

$update
export function markMilestoneAsIncomplete(id: string): Result<Milestone, string> {
    return match(milestoneStorage.get(id), {
        Some: (milestone) => {
            const updatedMilestone: Milestone = {
                ...milestone,
                isCompleted: false,
                updated_at: Opt.Some(ic.time()),
            };
            milestoneStorage.insert(milestone.id, updatedMilestone);
            return Result.Ok<Milestone, string>(updatedMilestone);
        },
        None: () => Result.Err<Milestone, string>(`Milestone with id:${id} not found`),
    });
}

$query
export function getGoalsByUser(owner: Principal): Vec<Goal> {
    const goals = goalStorage.values().filter((goal) => goal.owner === owner);
    return goals;
}

$update
export function insertMilestoneIntoGoal(goalId: string, milestoneId: string): Result<Goal, string> {
    return match(goalStorage.get(goalId), {
        Some: (goal) => {
            if (!arePrincipalsEqual(goal.owner, ic.caller())) {
                return Result.Err<Goal, string>('You are not authorized to access Goal');
            }

            return match(milestoneStorage.get(milestoneId), {
                Some: (milestoneData) => {
                    const updatedGoal: Goal = {
                        ...goal,
                        milestones: [...goal.milestones, milestoneData],
                        updated_at: Opt.Some(ic.time()),
                    };
                    goalStorage.insert(goal.id, updatedGoal);
                    return Result.Ok<Goal, string>(updatedGoal);
                },
                None: () => Result.Err<Goal, string>(`Milestone with id:${milestoneId} not found`),
            });
        },
        None: () => Result.Err<Goal, string>(`Goal with id:${goalId} not found`),
    });
}

$update
export function removeMilestoneFromGoal(goalId: string, milestoneId: string): Result<Goal, string> {
    return match(goalStorage.get(goalId), {
        Some: (goal) => {
            if (goal.owner !== ic.caller()) {
                return Result.Err<Goal, string>('You are not authorized to access Goal');
            }

            const updatedGoal: Goal = {
                ...goal,
                milestones: goal.milestones.filter((milestone) => milestone.id !== milestoneId),
                updated_at: Opt.Some(ic.time()),
            };
            goalStorage.insert(goal.id, updatedGoal);
            return Result.Ok<Goal, string>(updatedGoal);
        },
        None: () => Result.Err<Goal, string>(`Goal with id:${goalId} not found`),
    });
}

// UUID workaround
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    },
};
