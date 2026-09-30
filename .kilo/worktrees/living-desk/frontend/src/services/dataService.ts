import { apiClient } from './apiClient';

export interface TaskData {
    _id?: string;
    id: string;
    category: string;
    subCategory: string;
    query: string;
    metadata: {
        queryType: string;
        distribution: string;
        spelling: string;
        language: string;
        searchLinks: { name: string; url: string }[];
    };
    result: {
        title: string;
        subtitle?: string;
        developer?: string;
        category?: string;
        imageUrl?: string;
        description?: string;
        attribution?: string;
        sourceLink?: string;
        sourceName?: string;
    };
    correctRating?: string;
    correctComment?: string;
    usageMode?: 'practice' | 'test' | 'both';
    createdBy?: {
        _id: string;
        userName: string;
        email: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface TaskListResponse {
    status: string;
    message: string;
    data: TaskData[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

export interface CategoriesResponse {
    status: string;
    message: string;
    data: { category: string; subCategories: string[] }[];
}

export interface ProxiesResponse {
    status: string;
    message: string;
    data: string[];
}

export interface RatingsResponse {
    status: string;
    message: string;
    data: string[];
}

const TASKS_STORAGE_KEY = 'a1_raters_tasks_custom';
const MOCK_TASKS: TaskData[] = [
    {
        usageMode: 'test',
        id: '1',
        category: 'App Store',
        subCategory: 'App Store Search Result',
        query: 'cash app',
        metadata: {
            queryType: 'App Navigational',
            distribution: 'Mid',
            spelling: 'Spelled Correctly',
            language: 'English',
            searchLinks: [{ name: 'Google', url: 'https://www.google.com/search?q=cash+app' }],
        },
        result: {
            title: 'Bubble Shooter Cash: Pop Game',
            subtitle: 'Skills Clash',
            developer: 'Skills Clash',
            category: 'Games, Casual, Puzzle',
            imageUrl: 'https://placehold.co/100',
            description: 'Bubble Shooter Cash is a classic bubble shooter game with a twist! Shoot bubbles, clear the board, and compete for real cash prizes. Skill-based matching ensures fair competition.',
            sourceLink: 'https://www.google.com/search?q=Bubble+Shooter+Cash+App+Store',
            sourceName: 'View on App Store'
        },
        correctRating: 'Unacceptable',
        correctComment: 'The user is looking for the financial app "Cash App", but this result is a game. It is completely irrelevant to the user intent.'
    },
    {
        usageMode: 'test',
        id: '2',
        category: 'Video',
        subCategory: 'Video Hint',
        query: 'inception',
        metadata: {
            queryType: 'Movie Search',
            distribution: 'Head',
            spelling: 'Spelled Correctly',
            language: 'English',
            searchLinks: [{ name: 'Google', url: 'https://www.google.com/search?q=inception' }],
        },
        result: {
            title: 'Inception',
            subtitle: '2010',
            developer: 'Christopher Nolan',
            category: 'Sci-Fi, Action',
            imageUrl: 'https://placehold.co/100?text=Inception',
            description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
            sourceLink: 'https://www.google.com/search?q=Inception+Movie',
            sourceName: 'View Info'
        },
        correctRating: 'Perfect',
        correctComment: 'This is the exact movie the user is looking for. Title, Director, and year match the query intent perfectly.'
    },
    {
        usageMode: 'test',
        id: '3',
        category: 'App Store',
        subCategory: 'App Store Search Result',
        query: 'video star',
        metadata: {
            queryType: 'App Navigational',
            distribution: 'Mid',
            spelling: 'Spelled Correctly',
            language: 'English',
            searchLinks: [{ name: 'Google', url: 'https://www.google.com/search?q=video+star' }],
        },
        result: {
            title: 'VivaVideo - Video Editor',
            subtitle: 'QuVideo Inc.',
            developer: 'QuVideo Inc.',
            category: 'Photo & Video, Social Networking',
            imageUrl: 'https://placehold.co/100?text=VivaVideo',
            description: 'Free Video Editor with Music, Effects, Transitions. Best Video Maker App. (Extracted from user image)',
            sourceLink: 'https://www.google.com/search?q=VivaVideo+Video+Editor+App+Store',
            sourceName: 'View on App Store'
        },
        correctRating: 'Excellent',
        correctComment: 'both apps are by different developers with simialr functionalities (music video editor apps ) the returned app is of good quality'
    },
    {
        usageMode: 'test',
        id: '4',
        category: 'App Store',
        subCategory: 'App Store Search Result',
        query: 'hairdresser games',
        metadata: {
            queryType: 'Functional',
            distribution: 'Mid',
            spelling: 'Spelled Correctly',
            language: 'English',
            searchLinks: [{ name: 'Google', url: 'https://www.google.com/search?q=hairdresser+games' }],
        },
        result: {
            title: 'Block Craft 3D: Building Games',
            subtitle: 'Fun Games For Free',
            developer: 'Fun Games For Free',
            category: 'Games, Simulation',
            imageUrl: 'https://placehold.co/100?text=Block+Craft',
            description: 'Build your own village in this 3D simulator game. Crafting and Building. (Extracted from user image)',
            sourceLink: 'https://www.google.com/search?q=Block+Craft+3D+App+Store',
            sourceName: 'View on App Store'
        },
        correctRating: 'Unacceptable',
        correctComment: 'Unacceptable: Off Topic: A piece of content that is unrelated to the query, and does not satisfy a primary nor a secondary intent of the query. the intent of the query is for hair dressing games. the returned app is a block building game'
    },
    {
        usageMode: 'test',
        id: '5',
        category: 'App Store',
        subCategory: 'App Store Search Result',
        query: 'apple',
        metadata: {
            queryType: 'Dev Navigational',
            distribution: 'Head',
            spelling: 'Spelled Correctly',
            language: 'English',
            searchLinks: [{ name: 'Google', url: 'https://www.google.com/search?q=apple' }],
        },
        result: {
            title: 'Apple',
            subtitle: 'Developer',
            developer: 'Apple',
            category: 'Developer',
            imageUrl: 'https://placehold.co/100?text=Apple',
            description: 'Apple Developer Card.',
            sourceLink: 'https://apps.apple.com/developer/apple/id284417353?mt=12',
            sourceName: 'View on App Store'
        },
        correctRating: 'Perfect',
        correctComment: 'Perfect: For a Dev navigational query, the intended developer card is rated Perfect. the result is the developers card of the intended developer'
    },
    {
        usageMode: 'test',
        id: '6',
        category: 'App Store',
        subCategory: 'App Store Search Result',
        query: 'fitness',
        metadata: {
            queryType: 'Functional',
            distribution: 'Head',
            spelling: 'Spelled Correctly',
            language: 'Italian',
            searchLinks: [{ name: 'Google', url: 'https://www.google.com/search?q=fitness' }],
        },
        result: {
            title: 'Allenati sfruttando il tuo peso',
            subtitle: 'Editorial Item',
            developer: 'Apple',
            category: 'Health & Fitness',
            imageUrl: 'https://placehold.co/100?text=Editorial',
            description: 'Train With Your Own Bodyweight. A story containing multiple apps.',
            sourceLink: 'https://www.google.com/search?q=Allenati+sfruttando+il+tuo+peso+app+store',
            sourceName: 'View on App Store'
        },
        correctRating: 'Perfect',
        correctComment: 'Perfect: Functional query: a story containing multiple apps satisfying the primary intent is rated Perfect. the returned app is a story that contains a collection of fitness apps'
    },
];

const normalizeTask = (task: TaskData): TaskData => ({
    ...task,
    id: task._id || task.id,
});

export const dataService = {
    async getTasks(category?: string, subCategory?: string, mode?: string, page = 1, limit = 50): Promise<TaskData[]> {
        try {
            let endpoint = `/tasks?page=${page}&limit=${limit}`;
            if (category) endpoint += `&category=${encodeURIComponent(category)}`;
            if (subCategory) endpoint += `&subCategory=${encodeURIComponent(subCategory)}`;
            if (mode) endpoint += `&mode=${encodeURIComponent(mode)}`;

            const response = await apiClient.get<TaskListResponse>(endpoint);
            if (response.status === 'success' && response.data) {
                return response.data.map(normalizeTask);
            }
        } catch (error) {
            console.error('Failed to fetch tasks from backend, using local fallback:', error);
        }

        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        let customTasks: TaskData[] = [];
        try {
            customTasks = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Corrupted tasks data", e);
            localStorage.removeItem(TASKS_STORAGE_KEY);
        }

        const allTasks = [...MOCK_TASKS, ...customTasks];

        if (!category) return allTasks;
        return allTasks.filter(t => t.category === category || t.subCategory === category);
    },

    async getTaskById(id: string): Promise<TaskData | undefined> {
        try {
            const response = await apiClient.get<{ status: string; data: TaskData }>(`/tasks/${id}`);
            if (response.status === 'success' && response.data) {
                return normalizeTask(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch task from backend, using local fallback:', error);
        }

        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        let customTasks: TaskData[];
        try {
            customTasks = stored ? JSON.parse(stored) : [];
        } catch { customTasks = []; }

        const allTasks = [...MOCK_TASKS, ...customTasks];
        return allTasks.find(t => t.id === id || t._id === id);
    },

    async getTasksByCategory(category: string, subCategory?: string, mode?: string): Promise<TaskData[]> {
        try {
            let endpoint = `/tasks/category/${encodeURIComponent(category)}`;
            if (subCategory) endpoint += `/${encodeURIComponent(subCategory)}`;
            if (mode) endpoint += `?mode=${encodeURIComponent(mode)}`;

            const response = await apiClient.get<{ status: string; data: TaskData[] }>(endpoint);
            if (response.status === 'success' && response.data) {
                return response.data.map(normalizeTask);
            }
        } catch (error) {
            console.error('Failed to fetch tasks by category from backend, using local fallback:', error);
        }

        return this.getTasks(category, subCategory, mode);
    },

    async getCategories(): Promise<{ category: string; subCategories: string[] }[]> {
        try {
            const response = await apiClient.get<CategoriesResponse>('/tasks/categories');
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch categories from backend, using local fallback:', error);
        }

        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        let customTasks: TaskData[];
        try {
            customTasks = stored ? JSON.parse(stored) : [];
        } catch { customTasks = []; }

        const allTasks = [...MOCK_TASKS, ...customTasks];
        const categoryMap = new Map<string, Set<string>>();
        
        allTasks.forEach(task => {
            if (!categoryMap.has(task.category)) {
                categoryMap.set(task.category, new Set());
            }
            categoryMap.get(task.category)!.add(task.subCategory);
        });

        return Array.from(categoryMap.entries()).map(([category, subCategories]) => ({
            category,
            subCategories: Array.from(subCategories),
        }));
    },

    async getProxies(): Promise<string[]> {
        try {
            const response = await apiClient.get<ProxiesResponse>('/tasks/proxies');
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch proxies from backend, using local fallback:', error);
        }

        return ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];
    },

    async getRatingOptions(): Promise<string[]> {
        try {
            const response = await apiClient.get<RatingsResponse>('/tasks/ratings');
            if (response.status === 'success' && response.data) {
                return response.data;
            }
        } catch (error) {
            console.error('Failed to fetch ratings from backend, using local fallback:', error);
        }

        return ['Navigational', 'Excellent', 'Good', 'Acceptable', 'Unacceptable', 'Perfect'];
    },

    async saveTask(newTask: TaskData): Promise<TaskData> {
        try {
            const response = await apiClient.post<{ status: string; message?: string; data: TaskData }>('/tasks', newTask);
            if (response.status === 'success' && response.data) {
                return normalizeTask(response.data);
            }
            throw new Error(response.message || 'Failed to create task');
        } catch (error) {
            console.error('Backend save failed, saving locally:', error);
            
            const stored = localStorage.getItem(TASKS_STORAGE_KEY);
            const customTasks: TaskData[] = stored ? JSON.parse(stored) : [];
            customTasks.push(newTask);
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(customTasks));
            
            return newTask;
        }
    },

    async updateTask(id: string, updates: Partial<TaskData>): Promise<TaskData | undefined> {
        try {
            const response = await apiClient.patch<{ status: string; data: TaskData }>(`/tasks/${id}`, updates);
            if (response.status === 'success' && response.data) {
                return normalizeTask(response.data);
            }
        } catch (error) {
            console.error('Failed to update task on backend:', error);
        }

        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
            const customTasks: TaskData[] = JSON.parse(stored);
            const index = customTasks.findIndex(t => t.id === id);
            if (index !== -1) {
                customTasks[index] = { ...customTasks[index], ...updates };
                localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(customTasks));
                return customTasks[index];
            }
        }
        return undefined;
    },

    async deleteTask(id: string): Promise<boolean> {
        try {
            const response = await apiClient.delete<{ status: string }>(`/tasks/${id}`);
            if (response.status === 'success') {
                return true;
            }
        } catch (error) {
            console.error('Failed to delete task on backend:', error);
        }

        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
            const customTasks: TaskData[] = JSON.parse(stored);
            const filtered = customTasks.filter(t => t.id !== id);
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filtered));
            return true;
        }
        return false;
    },

    saveTaskLocal(newTask: TaskData) {
        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        const customTasks: TaskData[] = stored ? JSON.parse(stored) : [];
        customTasks.push(newTask);
        try {
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(customTasks));
        } catch (e) {
            console.error("Storage limit reached", e);
            throw new Error("Storage full! Please delete some old tasks or upload smaller images.", { cause: e });
        }
    },

    getTestHistory: (username: string, testType: string): { attempts: number, scores: number[] } => {
        const key = `a1_test_history_${username}_${testType}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : { attempts: 0, scores: [] };
    },

    saveTestResult: (username: string, testType: string, score: number) => {
        const key = `a1_test_history_${username}_${testType}`;
        const stored = localStorage.getItem(key);
        const history = stored ? JSON.parse(stored) : { attempts: 0, scores: [] };

        history.attempts += 1;
        history.scores.push(score);

        localStorage.setItem(key, JSON.stringify(history));
        return history;
    },

    deleteTaskLocal: (id: string) => {
        const stored = localStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
            const customTasks: TaskData[] = JSON.parse(stored);
            const filtered = customTasks.filter(t => t.id !== id);
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filtered));
        }
    }
};