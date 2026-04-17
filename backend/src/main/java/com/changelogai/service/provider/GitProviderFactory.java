package com.changelogai.service.provider;

import com.changelogai.entity.enums.GitProvider;
import com.changelogai.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class GitProviderFactory {

    private final Map<String, GitProviderService> providers;

    public GitProviderFactory(List<GitProviderService> providerList) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(
                        p -> p.getProviderName().toUpperCase(),
                        Function.identity()
                ));
    }

    public GitProviderService getProvider(GitProvider provider) {
        GitProviderService service = providers.get(provider.name());
        if (service == null) {
            throw new BadRequestException("Provider " + provider + " is not configured.");
        }
        return service;
    }

    public GitProviderService getProvider(String providerName) {
        GitProviderService service = providers.get(providerName.toUpperCase());
        if (service == null) {
            throw new BadRequestException("Provider " + providerName + " is not configured.");
        }
        return service;
    }

    public List<String> getAvailableProviders() {
        return providers.values().stream()
                .map(GitProviderService::getProviderName)
                .collect(Collectors.toList());
    }
}
