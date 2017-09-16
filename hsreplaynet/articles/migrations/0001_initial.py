# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2017-01-07 03:11
from __future__ import unicode_literals

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Article',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(max_length=200)),
                ('contents', models.TextField(blank=True)),
                ('excerpt', models.TextField(blank=True, help_text='Defaults to the first paragraph')),
                ('draft', models.BooleanField(default=False, help_text='Drafts are only visible to staff.')),
                ('listed', models.BooleanField(default=True, help_text='Whether the post appears in lists.')),
                ('enable_comments', models.BooleanField(default=True)),
                ('template_name', models.CharField(blank=True, help_text='Use a custom template', max_length=100)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('published', models.DateTimeField(blank=True, null=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-published', '-created'),
            },
        ),
    ]
