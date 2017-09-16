# -*- coding: utf-8 -*-
# Generated by Django 1.11.3 on 2017-07-04 06:26
from __future__ import unicode_literals

import django.contrib.postgres.fields.jsonb
from django.db import migrations, models

import hsreplaynet.utils.fields


class Migration(migrations.Migration):

    dependencies = [
        ('uploads', '0010_auto_20170213_1659'),
    ]

    operations = [
        migrations.CreateModel(
            name='Descriptor',
            fields=[
                ('shortid', hsreplaynet.utils.fields.ShortUUIDField(blank=True, editable=False, max_length=22, primary_key=True, serialize=False, unique=True, verbose_name='Short ID')),
                ('descriptor', django.contrib.postgres.fields.jsonb.JSONField()),
                ('created', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
