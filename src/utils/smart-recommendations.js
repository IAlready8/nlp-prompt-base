class SmartRecommendations {
    constructor(options = {}) {
        this.options = {
            maxRecommendations: options.maxRecommendations || 10,
            minSimilarity: options.minSimilarity || 0.3,
            enableUserBehavior: options.enableUserBehavior !== false,
            enableTrending: options.enableTrending !== false,
            enableSeasonality: options.enableSeasonality !== false,
            ...options
        };
        
        this.userBehaviorData = new Map();
        this.trendingPrompts = new Map();
        this.seasonalPatterns = new Map();
        this.logger = options.logger || console;
    }
    
    async generateRecommendations(userId, prompts, userHistory = [], options = {}) {
        const recommendations = [];
        const usedPromptIds = new Set();
        
        try {
            // Get different types of recommendations
            const personalizedRecs = await this.getPersonalizedRecommendations(userId, prompts, userHistory);
            const trendingRecs = await this.getTrendingRecommendations(prompts);
            const similarityRecs = await this.getSimilarityBasedRecommendations(userHistory, prompts);
            const diversityRecs = await this.getDiversityRecommendations(userHistory, prompts);
            const workflowRecs = await this.getWorkflowRecommendations(userHistory, prompts);
            
            // Combine and score recommendations
            const allRecs = [
                ...personalizedRecs.map(r => ({ ...r, source: 'personalized', baseScore: 1.0 })),
                ...trendingRecs.map(r => ({ ...r, source: 'trending', baseScore: 0.8 })),
                ...similarityRecs.map(r => ({ ...r, source: 'similarity', baseScore: 0.9 })),
                ...diversityRecs.map(r => ({ ...r, source: 'diversity', baseScore: 0.7 })),
                ...workflowRecs.map(r => ({ ...r, source: 'workflow', baseScore: 0.85 }))
            ];
            
            // Remove duplicates and score
            const scoredRecs = allRecs
                .filter(rec => !usedPromptIds.has(rec.id))
                .map(rec => {
                    usedPromptIds.add(rec.id);
                    return {
                        ...rec,
                        finalScore: this.calculateFinalScore(rec, userId, userHistory)
                    };
                })
                .sort((a, b) => b.finalScore - a.finalScore)
                .slice(0, this.options.maxRecommendations);
            
            return {
                recommendations: scoredRecs,
                metadata: {
                    userId,
                    totalCandidates: allRecs.length,
                    timestamp: new Date().toISOString(),
                    sources: this.getSourceDistribution(scoredRecs)
                }
            };
            
        } catch (error) {
            this.logger.error('Error generating recommendations', { error: error.message, userId });
            return { recommendations: [], metadata: { error: error.message } };
        }
    }
    
    async getPersonalizedRecommendations(userId, prompts, userHistory) {
        if (!this.options.enableUserBehavior || userHistory.length === 0) {
            return [];
        }
        
        const userProfile = this.buildUserProfile(userId, userHistory);
        const recommendations = [];
        
        for (const prompt of prompts) {
            const score = this.calculatePersonalizationScore(prompt, userProfile);
            
            if (score > this.options.minSimilarity) {
                recommendations.push({
                    ...prompt,
                    score,
                    reason: this.getPersonalizationReason(prompt, userProfile)
                });
            }
        }
        
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }
    
    async getTrendingRecommendations(prompts) {
        if (!this.options.enableTrending) {
            return [];
        }
        
        const trendingScores = this.calculateTrendingScores(prompts);
        
        return prompts
            .map(prompt => ({
                ...prompt,
                score: trendingScores.get(prompt.id) || 0,
                reason: 'Currently trending'
            }))
            .filter(rec => rec.score > 0.5)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }
    
    async getSimilarityBasedRecommendations(userHistory, prompts) {
        if (userHistory.length === 0) {
            return [];
        }
        
        const recentPrompts = userHistory.slice(-5);
        const recommendations = [];
        
        for (const prompt of prompts) {
            let maxSimilarity = 0;
            let bestMatch = null;
            
            for (const userPrompt of recentPrompts) {
                const similarity = this.calculateTextSimilarity(prompt.text, userPrompt.text);
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    bestMatch = userPrompt;
                }
            }
            
            if (maxSimilarity > this.options.minSimilarity) {
                recommendations.push({
                    ...prompt,
                    score: maxSimilarity,
                    reason: `Similar to "${bestMatch.text.substring(0, 50)}..."`
                });
            }
        }
        
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);
    }
    
    async getDiversityRecommendations(userHistory, prompts) {
        if (userHistory.length === 0) {
            return [];
        }
        
        const userCategories = new Set(userHistory.map(p => p.category));
        const userTags = new Set(userHistory.flatMap(p => p.tags || []));
        
        const diversePrompts = prompts.filter(prompt => {
            const categoryDiverse = !userCategories.has(prompt.category);
            const tagDiverse = !(prompt.tags || []).some(tag => userTags.has(tag));
            return categoryDiverse || tagDiverse;
        });
        
        return diversePrompts
            .map(prompt => ({
                ...prompt,
                score: 0.6 + (prompt.rating || 0) / 10, // Base diversity score + quality bonus
                reason: 'Explore new topics'
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }
    
    async getWorkflowRecommendations(userHistory, prompts) {
        if (userHistory.length === 0) {
            return [];
        }
        
        const workflowPatterns = this.detectWorkflowPatterns(userHistory);
        const recommendations = [];
        
        for (const pattern of workflowPatterns) {
            const nextSteps = this.predictNextSteps(pattern, prompts);
            recommendations.push(...nextSteps);
        }
        
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }
    
    buildUserProfile(userId, userHistory) {
        const profile = {
            userId,
            preferredCategories: new Map(),
            commonTags: new Map(),
            averageRating: 0,
            usagePatterns: {
                timeOfDay: new Map(),
                dayOfWeek: new Map(),
                frequency: userHistory.length
            },
            qualityPreference: 0,
            diversityPreference: 0
        };
        
        userHistory.forEach(prompt => {
            // Categories
            const category = prompt.category;
            profile.preferredCategories.set(category, (profile.preferredCategories.get(category) || 0) + 1);
            
            // Tags
            (prompt.tags || []).forEach(tag => {
                profile.commonTags.set(tag, (profile.commonTags.get(tag) || 0) + 1);
            });
            
            // Usage patterns
            if (prompt.usedAt) {
                const date = new Date(prompt.usedAt);
                const hour = date.getHours();
                const day = date.getDay();
                
                profile.usagePatterns.timeOfDay.set(hour, (profile.usagePatterns.timeOfDay.get(hour) || 0) + 1);
                profile.usagePatterns.dayOfWeek.set(day, (profile.usagePatterns.dayOfWeek.get(day) || 0) + 1);
            }
        });
        
        // Calculate averages and preferences
        profile.averageRating = userHistory.reduce((sum, p) => sum + (p.rating || 0), 0) / userHistory.length;
        profile.qualityPreference = profile.averageRating / 5; // Normalize to 0-1
        
        // Calculate diversity preference based on category spread
        const categoryCount = profile.preferredCategories.size;
        const totalPrompts = userHistory.length;
        profile.diversityPreference = Math.min(categoryCount / 5, 1); // Normalize to 0-1
        
        return profile;
    }
    
    calculatePersonalizationScore(prompt, userProfile) {
        let score = 0;
        
        // Category preference
        const categoryWeight = userProfile.preferredCategories.get(prompt.category) || 0;
        score += (categoryWeight / userProfile.usagePatterns.frequency) * 0.4;
        
        // Tag similarity
        const promptTags = prompt.tags || [];
        const tagScore = promptTags.reduce((sum, tag) => {
            const weight = userProfile.commonTags.get(tag) || 0;
            return sum + (weight / userProfile.usagePatterns.frequency);
        }, 0) / Math.max(promptTags.length, 1);
        score += tagScore * 0.3;
        
        // Quality alignment
        const promptRating = prompt.rating || 3; // Default to average
        const qualityAlignment = 1 - Math.abs(promptRating / 5 - userProfile.qualityPreference);
        score += qualityAlignment * 0.2;
        
        // Freshness bonus
        if (prompt.createdAt) {
            const daysSinceCreated = (Date.now() - new Date(prompt.createdAt)) / (1000 * 60 * 60 * 24);
            const freshnessBonus = Math.max(0, 1 - daysSinceCreated / 30); // Decay over 30 days
            score += freshnessBonus * 0.1;
        }
        
        return Math.min(score, 1);
    }
    
    getPersonalizationReason(prompt, userProfile) {
        const reasons = [];
        
        const categoryWeight = userProfile.preferredCategories.get(prompt.category) || 0;
        if (categoryWeight > 0) {
            reasons.push(`You often use ${prompt.category} prompts`);
        }
        
        const commonTags = (prompt.tags || []).filter(tag => userProfile.commonTags.has(tag));
        if (commonTags.length > 0) {
            reasons.push(`Related to your interests: ${commonTags.slice(0, 2).join(', ')}`);
        }
        
        if (prompt.rating && prompt.rating >= 4) {
            reasons.push('High-quality prompt');
        }
        
        return reasons.length > 0 ? reasons.join('; ') : 'Matches your usage patterns';
    }
    
    calculateTrendingScores(prompts) {
        const scores = new Map();
        const now = Date.now();
        const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
        
        prompts.forEach(prompt => {
            let score = 0;
            
            // Recent usage boost
            if (prompt.lastUsed && new Date(prompt.lastUsed) > weekAgo) {
                score += 0.5;
            }
            
            // Usage frequency
            const usageCount = prompt.usage_count || 0;
            score += Math.min(usageCount / 10, 0.3);
            
            // Recent creation
            if (prompt.createdAt && new Date(prompt.createdAt) > weekAgo) {
                score += 0.2;
            }
            
            // High rating
            if (prompt.rating && prompt.rating >= 4) {
                score += 0.2;
            }
            
            scores.set(prompt.id, score);
        });
        
        return scores;
    }
    
    calculateTextSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size; // Jaccard similarity
    }
    
    detectWorkflowPatterns(userHistory) {
        const patterns = [];
        const sequences = this.extractSequences(userHistory, 3); // Look for 3-prompt sequences
        
        const patternCounts = new Map();
        sequences.forEach(sequence => {
            const pattern = sequence.map(p => p.category).join(' -> ');
            patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
        });
        
        // Return patterns that appear more than once
        for (const [pattern, count] of patternCounts.entries()) {
            if (count > 1) {
                patterns.push({
                    pattern: pattern.split(' -> '),
                    frequency: count,
                    confidence: count / sequences.length
                });
            }
        }
        
        return patterns.sort((a, b) => b.confidence - a.confidence);
    }
    
    extractSequences(history, length) {
        const sequences = [];
        
        for (let i = 0; i <= history.length - length; i++) {
            sequences.push(history.slice(i, i + length));
        }
        
        return sequences;
    }
    
    predictNextSteps(pattern, allPrompts) {
        const nextSteps = [];
        const lastCategory = pattern.pattern[pattern.pattern.length - 1];
        
        // Look for prompts that commonly follow this pattern
        const candidatePrompts = allPrompts.filter(prompt => {
            // Simple heuristic: suggest prompts from related categories or next logical steps
            const relatedCategories = this.getRelatedCategories(lastCategory);
            return relatedCategories.includes(prompt.category);
        });
        
        candidatePrompts.forEach(prompt => {
            nextSteps.push({
                ...prompt,
                score: pattern.confidence * 0.8,
                reason: `Common next step after ${lastCategory} prompts`
            });
        });
        
        return nextSteps.slice(0, 2);
    }
    
    getRelatedCategories(category) {
        const relationships = {
            'Code': ['Dev', 'Analysis'],
            'Dev': ['Code', 'Business'],
            'Writing': ['Creative', 'Business'],
            'Creative': ['Writing', 'General'],
            'Business': ['Analysis', 'Writing'],
            'Analysis': ['Research', 'Business'],
            'Research': ['Analysis', 'Writing'],
            'General': ['Writing', 'Creative'],
            'Cognitive': ['Analysis', 'Research']
        };
        
        return relationships[category] || [category];
    }
    
    calculateFinalScore(recommendation, userId, userHistory) {
        let score = recommendation.baseScore * recommendation.score;
        
        // Apply user-specific adjustments
        const userProfile = this.getUserProfile(userId);
        if (userProfile) {
            // Boost if aligns with user preferences
            score *= (1 + userProfile.diversityPreference * 0.1);
            score *= (1 + userProfile.qualityPreference * 0.1);
        }
        
        // Time-based adjustments
        const timeBoost = this.getTimeBasedBoost(recommendation);
        score *= (1 + timeBoost);
        
        // Novelty bonus (avoid recent recommendations)
        const noveltyBonus = this.getNoveltyBonus(recommendation, userId);
        score *= (1 + noveltyBonus);
        
        return Math.min(score, 1);
    }
    
    getTimeBasedBoost(recommendation) {
        if (!this.options.enableSeasonality) {
            return 0;
        }
        
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        
        // Simple time-based boosts
        let boost = 0;
        
        // Work hours boost for business/dev prompts
        if ((hour >= 9 && hour <= 17) && ['Business', 'Dev', 'Code'].includes(recommendation.category)) {
            boost += 0.1;
        }
        
        // Evening boost for creative prompts
        if ((hour >= 18 || hour <= 6) && ['Creative', 'Writing'].includes(recommendation.category)) {
            boost += 0.1;
        }
        
        // Weekend boost for creative/personal prompts
        if ((dayOfWeek === 0 || dayOfWeek === 6) && ['Creative', 'General'].includes(recommendation.category)) {
            boost += 0.05;
        }
        
        return boost;
    }
    
    getNoveltyBonus(recommendation, userId) {
        // Check if this recommendation was recently shown
        const recentRecs = this.getRecentRecommendations(userId);
        const wasRecentlyShown = recentRecs.some(rec => rec.id === recommendation.id);
        
        return wasRecentlyShown ? -0.2 : 0.1; // Penalty for recent, bonus for novel
    }
    
    getUserProfile(userId) {
        return this.userBehaviorData.get(userId) || null;
    }
    
    getRecentRecommendations(userId) {
        // This would be stored in a more persistent way in a real implementation
        return [];
    }
    
    getSourceDistribution(recommendations) {
        const distribution = {};
        recommendations.forEach(rec => {
            distribution[rec.source] = (distribution[rec.source] || 0) + 1;
        });
        return distribution;
    }
    
    trackRecommendationInteraction(userId, recommendationId, interaction) {
        // Track user interactions with recommendations for learning
        if (!this.userBehaviorData.has(userId)) {
            this.userBehaviorData.set(userId, {
                interactions: [],
                preferences: {}
            });
        }
        
        const userData = this.userBehaviorData.get(userId);
        userData.interactions.push({
            recommendationId,
            interaction, // 'clicked', 'dismissed', 'saved', etc.
            timestamp: new Date().toISOString()
        });
        
        // Keep only recent interactions
        if (userData.interactions.length > 1000) {
            userData.interactions = userData.interactions.slice(-1000);
        }
    }
    
    getRecommendationAnalytics() {
        const analytics = {
            totalRecommendations: 0,
            sourceBreakdown: {},
            userEngagement: {
                totalUsers: this.userBehaviorData.size,
                avgInteractionsPerUser: 0
            },
            topCategories: new Map(),
            performance: {
                avgScore: 0,
                scoreDistribution: {}
            }
        };
        
        // Calculate analytics from stored data
        let totalInteractions = 0;
        this.userBehaviorData.forEach(userData => {
            totalInteractions += userData.interactions.length;
        });
        
        analytics.userEngagement.avgInteractionsPerUser = 
            totalInteractions / Math.max(this.userBehaviorData.size, 1);
        
        return analytics;
    }
    
    clearUserData(userId) {
        this.userBehaviorData.delete(userId);
    }
    
    exportUserData(userId) {
        return this.userBehaviorData.get(userId) || null;
    }
    
    importUserData(userId, data) {
        this.userBehaviorData.set(userId, data);
    }
}

module.exports = SmartRecommendations;