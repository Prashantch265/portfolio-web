import type { ProjectWithNav } from "@portfolio/types";
import type { ContentSource } from "./content-source";
import { cv } from "./static/cv";
import { githubActivity } from "./static/github-activity";
import { posts } from "./static/posts";
import { projects } from "./static/projects";
import { stackLayers } from "./static/stack-layers";
import { statusStrip } from "./static/status-strip";

function withNav(): ProjectWithNav[] {
  // Derived from array order, not hand-authored — the mockup's own
  // prevSlug/nextSlug were inconsistent (a project's `next` didn't always
  // point back via its target's `prev`). This is always consistent by
  // construction.
  return projects.map((project, i) => ({
    ...project,
    prevSlug: projects[i - 1]?.slug ?? null,
    nextSlug: projects[i + 1]?.slug ?? null,
  }));
}

export const staticContentSource: ContentSource = {
  async getProjects() {
    return withNav();
  },
  async getFeaturedProjects() {
    return withNav().filter((p) => p.featured);
  },
  async getProject(slug) {
    return withNav().find((p) => p.slug === slug) ?? null;
  },
  async getPosts() {
    return posts;
  },
  async getPost(slug) {
    return posts.find((p) => p.slug === slug) ?? null;
  },
  async getCV() {
    return cv;
  },
  async getStackLayers() {
    return stackLayers;
  },
  async getGithubActivity() {
    return githubActivity;
  },
  async getStatusStrip() {
    return statusStrip;
  },
};
