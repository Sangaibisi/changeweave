package com.changelogai.service.provider;

import java.util.List;
import java.util.Map;

public interface GitProviderService {

    String getProviderName();

    String getAuthorizationUrl(String userId);

    String exchangeCodeForToken(String code);

    Map<String, Object> fetchUser(String accessToken);

    List<Map<String, Object>> listRepos(String accessToken);

    String createWebhook(String accessToken, String repoFullName, String secret, String callbackUrl);

    void deleteWebhook(String accessToken, String repoFullName, String hookId);

    List<Map<String, Object>> fetchCommits(String accessToken, String repoFullName, String branch, int count);

    List<Map<String, Object>> fetchTags(String accessToken, String repoFullName);
}
